# [chrome-cache-reader]()

> Read cached files stored by chrome or chromium

This module will allow you to retrieve cached files by their url. For example, 
when you navigate to google.com, the google logo is downloaded and cached so that 
it is rendered.

![Copy url](https://my.mixtape.moe/yrcdwb.png)

You can right click on the image and copy the image address and use that as the 
argument for `ChromeCacheReader::get()` to get a `ChromeCacheFile` instance that
holds the cached file's **filename**, **url**, **content** & http response **headers**.

`ChromeCacheFile::content` is a buffer of the file that was cached, however you
will have to read the `ChromeCacheFile::headers` object, in order to determine 
the file's **content-type** or mimetype, & **content-encoding** in case it was compressed. 

For the example above, the url is `https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png` & a snippet of how to extract the image is:

```js
const reader = new ChromeCacheReader()
reader.update()
.then(() => {
  const url = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'
  reader.get(url)
  .then((r) => {
    console.log('\nfilename:', r.filename)
    console.log('\nurl:', r.url)
    console.log('\ncontent:', r.content)
    console.log('\nheaders:', r.headers)
    console.log('\n')
  })
  .catch(error => console.log(error))
})
.catch(error => console.log(error))
```
Which returns the following: *(assuming you are using Linux & Chromium)*

![Example output](https://my.mixtape.moe/trutkl.png)


*see example.js*

---------------------------------------------------------------------------------------------------


## Install

`npm i chrome-cache-reader --save`


## Usage

**NOTE** You may have to specify the **cachePath** option, this is the location where cached files are stored. By default: `~/.cache/chromium/Default/Cache` is used for linux and `~\AppData\Local\Google\Chrome\User Data\Default\Cache` is used for windows.

```
const os = require('os')
const ChromeCacheReader = require('chrome-cache-reader')

const options = {
  cachePath: `${ os.homedir() }/.cache/google-chrome/Default/Cache`,
}

const reader = new ChromeCacheReader(options)

reader.update()
.then(() => {
  const url = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'

  reader.get(url)
  .then(chromeCacheFile => {
    console.log('\nfilename:', chromeCacheFile.filename)
    console.log('\nurl:', chromeCacheFile.url)
    console.log('\ncontent:', chromeCacheFile.content)
    console.log('\nheaders:', chromeCacheFile.headers)
    console.log('\n')
  })
  .catch(error => console.log(error))

})
.catch(error => console.log(error))

```

## Options

### DEFAULT OPTIONS

```
const DEFAULT_OPTIONS = {
  databasePath: './database',
  cachePath: null,
}
```

**cachePath** is `~/.cache/chromium/Default/Cache` on linux, `~\AppData\Local\Google\Chrome\User Data\Default\Cache` on windows, otherwise it is set to `null`. Location varies by browser version and platform so you may have to set this value manually. Works for both chrome & chromium.

**databasePath**: This module creates a lookup database using [leveldb](https://github.com/Level/level) in order to quickly find a cached file by their url. `databasePath` determines where this database will be stored.

*`databasePath` and `cachePath` are required, and must be valid values*

## API

### *class* ChromeCacheReader

> The chrome cache reader; what you will use to fetch cached files.

**void** ChromeCacheReader::**constructor**(Object **options**)

**Promise** ChromeCacheReader::**get**(String **url**)

Returns a `ChromeCacheFile` instance if the cached file is found, `null` if it does not exist or an `Error` if something goes wrong.

**Promise** ChromeCacheReader::**update()**

Updates lookup database so as to have all cached files ready for retrieval by their original **url**. You will only have to call this method when you are certain the cache has been updated (i.e Browsing the web).

### class ChromeCacheFile

> A parsed cache file

**void** ChromeCacheFile::**constructor**(Buffer **rawFile**)

**String** ChromeCacheFile::**filename**

*Read-only*. The name of the cached file found in `cachePath`.

**String** ChromeCacheFile::**url**

*Read-only*. The original url of the file that was cached.

**Buffer** ChromeCacheFile::**content**

*Read-only*. The contents of the file that was cached. Keep in mind that it may
be compressed (i.e with gzip), so you may have to use the value in `content-encoding` in the object found in `ChromeCacheFile::headers`.

**Object** ChromeCacheFile::**headers**

*Read-only*. An Oject containing the headers from the HTTP response that returned the file that was cached. Headers will vary however, the most relevant are `content-type` & `content-encoding` in case the file was compressed when it was cached.

**NOTE** Some requests do not return content or HTTP response headers, in those cases the only values that will be set are **filename** & **url**, everything else will be set to `null`


## License

MIT