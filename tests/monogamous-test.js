'use strict';

import test from 'tape'
import cp from 'child_process'

test('boot', (assert) => {
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
                assert.false(dupe.connected)
                app.kill()
                dupe.kill()
                assert.end()
            },100)
        }
    })
})
