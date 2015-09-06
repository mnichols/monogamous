'use strict';

import os from 'os'
import {EventEmitter} from 'events'
import path from 'path'
import fs from 'fs'
import net from 'net'
import minimist from 'minimist'
import stampit from 'stampit'

/**
 * handles duplicate instance attempts
 * */
const server = stampit()
    .props({
        force: false
        , emitter: undefined
    })
    .init(function(){
        let serve
        const handleReboot = (data) => {
            this.emitter.emit('reboot', this.args)
        }
        const handleConnection = (conn) => {
            conn.on('data', handleReboot)
        }
        const handleError = (err) => {
            console.error('boot server failed', err)
        }
        const handleListening = () => {
            this.emitter.emit('boot', this.args)
        }

        const start = () => {
            if(this.force) {
                this.emitter.emit('boot', this.args)
                return
            }
            this.removeSocket()
            serve = net.createServer(handleConnection)
            serve.listen(this.socketPath())
            serve.on('listening', handleListening)
            serve.on('error', handleError)
        }
        this.startServer = start
    })

const client = stampit()
    .methods({
        //try to connect to socket and forward args to running instance
        //on error, it must need to boot
        connect: function(){
            let spath = this.socketPath()
            let dupe
            const handleConnection = () => {
                //send data to previous instance and then shutdown
                dupe.write(JSON.stringify(process.argv), function(){
                    dupe.end()
                    //not an error...
                    process.exit(0)
                })
            }
            dupe = net.connect({path:spath},handleConnection)
            //unable to connect, so boot the app once our server starts
            dupe.on('error', this.startServer)
        }

    })


//boot strategy for windows
const win32 = stampit()
    .props({
        force: false
    })
    .compose(client, server)
    .methods({
        socketPath (){
            return `\\\\.\\pipe\\${this.sock}-sock}`
        }
        , removeSocket () {
            //nothing to do here
            return false
        }
        , boot () {
            this.startServer()
        }
    })

//boot strategy for everyone else
const defaultPlatform = stampit()
    .props({
        force: false
    })
    .compose(client, server)
    .methods({
        socketPath () {
            return path.join(os.tmpdir(),`${this.sock}-${process.env.USER}.sock`)
        }
        , boot() {
            //fail fast
            if(this.force || !fs.existsSync(this.socketPath())) {
                this.startServer()
            } else {
                this.connect()
            }
        }
        , removeSocket () {
            let spath = this.socketPath()
            if(fs.existsSync(spath)) {
                try {
                    fs.unlinkSync(spath)
                } catch( err ) {
                    /*
                     *
                     * Ignore ENOENT errors in case the file was deleted between the exists
                     * check and the call to unlink sync. This occurred occasionally on CI
                     * which is why this check is here.
                     * */
                    if( err.code !== 'ENOENT') {
                        throw err
                    }
                }
            }
        }
    })

export default stampit()
    .props({
        //the name of the app to name the socket/pipe
        sock: undefined
        //force instance to start
        , force: false
    })
    .init(function({ args}){
        if(!this.sock) {
            throw new Error('`sock` is required')
        }
        //compose event emitter to workaround stampit undefined return
        let emitter = this.emitter = new EventEmitter
        this.on = emitter.on.bind(emitter)
        this.once = emitter.once.bind(emitter)
        this.removeListener = emitter.removeListener.bind(emitter)
        this.removeAllListeners = emitter.removeAllListeners.bind(emitter)
        this.emit = emitter.emit.bind(emitter)

        /**
         * call this to emit proper events
         * based on state of app (running/not)
         * */
        this.boot = function(bootArgs) {
            let platform, argv = {}

            //collect all our arguments
            Object.assign(argv, minimist(process.argv.slice(2)))
            for(let arg of args) {
                Object.assign(argv, arg || {})
            }
            Object.assign(argv, bootArgs || {})
            if(process.platform === 'win32') {
                platform = win32({
                    sock: this.sock
                    , emitter: emitter
                    , force: this.force
                    , args: argv
                })
            } else {
                platform = defaultPlatform({
                    sock: this.sock
                    , emitter: emitter
                    , force: this.force
                    , args: argv
                })
            }

            // boot it!
            platform.boot()
        }.bind(this)
    })

