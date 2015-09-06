'use strict';

require('babel/register')
var monogamous = require('../src/monogamous')
var name = process.argv[2]
var booter = monogamous({ sock: 'test'},{ hee: 'haw'})
booter.on('boot',function(args) {
    process.send({ name: name,event: 'boot', args: args})
})
booter.on('reboot', function(args) {
    process.send({ name: name, event: 'reboot', args: args})
})
booter.boot({ madefer: 'walkin'})
