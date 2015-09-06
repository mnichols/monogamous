'use strict';

require('babel/register')
var monogamous = require('../src/monogamous')

let booter = monogamous({ sock: 'test'},{ hee: 'haw'})
booter.on('boot',function(args) {
    process.send({ name: process.argv[2],event: 'boot', args: args})
})
booter.on('reboot', function(args) {
    process.send({ name: process.argv[2], event: 'reboot', args: args})
})
booter.boot({ madefer: 'walkin'})
