# Monogamous

> Only one instance of an app at a time.

## Install

`npm install monogamous`

## Usage (using Electron as an example)

#### Decorating main process entrypoint
```js

//index.js
import monogamous from 'monogamous'
import main from './main' //main process app stuff
import app from 'app'

booter = monogamous({ sock: 'myapp'}, { other: 'args'})
/**
* this presumes your `app.on('ready')` is inside your boot method
*/
booter.on('boot', main.boot.bind(main))
booter.on('reboot', main.reboot.bind(main))
booter.on('error', function(err) { console.error('ops', err) })

booter.boot({ more: 'args'})
```

#### Inside main process entrypoint
```js

//index.js
import monogamous from 'monogamous'
import main from './main' //main process app stuff
import app from 'app'

booter = monogamous({ sock: 'myapp'}, { other: 'args'})

booter.on('boot', main.boot.bind(main))
booter.on('reboot', main.reboot.bind(main))
booter.on('error', function(err) { console.error('ops', err) })

//electron's ready event gets it going
app.on('ready', booter.boot.bind(booter))
```

## Events

- `boot` : raised if an instance is not running. Your app may start up pristine here
- `reboot` : another instance was attempted. 

All events receive an merged arguments object merging the following inputs:

- args passed to monogamous creation; eg `monogamous({ sock: 'foo'}, {these:'arepassedthru'})`
- process argv , hashed (using [minimist](https://www.npmjs.com/package/minimist))
- args passed to `boot`; eg `mono.boot({ these:'arealsopassedthru'})` 


## API

- `boot([args])` {Function} tries to connect to `sock`;failure to connect means an instance is running
