'use strict';

require('babel/register')
var monogamous = require('../src/monogamous')
let name = process.argv[2]
let booter = monogamous({ sock: 'test'},{ hee: 'haw'})
booter.on('end',function(e){
    process.send({ event: 'end', args: e})
})
booter.on('boot',function(e){
    process.send({ event: 'boot', args: e})
})
process.on('message', function(m){
    if(m === 'boot') {
        booter.boot()
    }
    if(m === 'end') {
        booter.end()
    }
})
