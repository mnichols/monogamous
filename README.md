# Monogamous

> Only one instance of an app at a time.

[![Build Status: Linux](https://travis-ci.org/mnichols/monogamous.svg?branch=master)](https://travis-ci.org/mnichols/monogamous)
[![Build Status: Windows](https://ci.appveyor.com/api/projects/status/14ud4t906nm8earn/branch/master?svg=true)](https://ci.appveyor.com/project/MikeNichols/monogamous/branch/master)

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

- `boot`   : raised if an instance is not running. Your app may start up pristine here
- `reboot` : another instance was attempted.
- `end`    : a call to `end()` shutdown the instance server

`boot` and `reboot` events receive an merged arguments object merging the following inputs,
in order of precedence:

- args passed to monogamous creation; eg `monogamous({ sock: 'foo'}, {these:'arepassedthru'})`
- process argv , hashed (using [minimist](https://www.npmjs.com/package/minimist))
- args passed to `boot`; eg `mono.boot({ these:'arealsopassedthru'})` 


## API

**Monogamous Factory**

```js
//only the 'sock' property is required to name your socket
let booter = monogamous({ sock: 'keepitsimple' }, [other args...])

```

**Instance Methods**

- `boot([args])` : {Function} tries to connect to `sock`;failure to connect means an instance is running
- `end()`        : {Function} closes socket server

