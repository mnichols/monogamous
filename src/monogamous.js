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
            let parsed
            try {
                parsed = JSON.parse(data.toString('utf-8'))
            } catch(err) {
                if(!(err instanceof SyntaxError )) {
                    throw err
                }
            }
            this.emitter.emit('reboot', parsed)
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
        const handleClose = () => {
            this.emitter.emit('end')
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
            serve.on('close', handleClose)
        }
        this.startServer = start
        this.end = function(){
            return serve.close()
        }
    })

const client = stampit()
    .methods({
        //try to connect to socket and forward args to running instance
        //on error, it must need to boot
        connect: function(){
            let spath = this.socketPath()
            let _client
            const handleConnection = () => {
                //send data to previous instance and then shutdown
                _client.write(JSON.stringify(this.args), function(){
                    _client.end()
                    //not an error...
                    process.exit(0)
                })
            }
            _client = net.connect({path:spath},handleConnection)
            //unable to connect, so boot the app once our server starts
            _client.on('error', this.startServer)
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
            this.connect()
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
        let platform
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
            args.push(minimist(process.argv.slice(2)))
            args.push(bootArgs)
            let argv = Object.assign({}, ...args)
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

        this.end = function() {
            if(platform) {
                return platform.end()
            }
            this.emit('end')
        }
    })

