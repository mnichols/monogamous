'use strict';

import test from 'tape'
import cp from 'child_process'
import monogamous from '../src/monogamous'

test('booting more than once instance', (assert) => {
    const appPath= __dirname + '/app.js'
    let app = cp.fork(appPath,['main'])
    let dupe

    let messages = []
    app.on('message',function(m) {
        messages.push(m)
        if(m.event === 'boot') {
            dupe = cp.fork(appPath,['sub1'])
        }
        if(m.event === 'reboot') {
            setTimeout(function(){
                assert.equal(messages.length, 2)
                assert.equal(messages[0].name,'main')
                assert.equal(messages[0].event, 'boot')
                assert.deepEqual(messages[0].args, {
                    '_': ['main']
                    , 'hee': 'haw'
                    , 'madefer': 'walkin'
                })
                assert.equal(messages[1].name,'main')
                assert.equal(messages[1].event,'reboot')
                assert.deepEqual(messages[1].args, {
                    '_': ['sub1']
                    , 'hee': 'haw'
                    , 'madefer': 'walkin'
                })
                assert.false(dupe.connected)
                assert.true(app.connected)
                app.kill()
                dupe.kill()
                assert.end()
            },100)
        }
    })
})

test('ending the booter', (assert) => {
    const appPath= __dirname + '/injectable.js'
    let app = cp.fork(appPath,['main'])
    app.on('message',function(m){
        if(m.event === 'boot') {
            return app.send('end')
        }
        if(m.event === 'end') {
            assert.true(app.connected)
            assert.pass('ended')
            app.kill()
            assert.end()
        }

    })
    app.send('boot')
})
