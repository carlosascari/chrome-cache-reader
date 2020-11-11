const fs = require('fs')
const path = require('path')
const os = require('os')
const level = require('level')

// Default Options
const DEFAULT_OPTIONS = {
  databasePath: './database',
  cachePath: null,
}

switch(os.platform()) {
  case 'linux':
    DEFAULT_OPTIONS.cachePath = `${ os.homedir() }/.cache/chromium/Default/Cache`
  break;
  case 'win32':
    DEFAULT_OPTIONS.cachePath = `${ os.homedir() }\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache`
  break;
  default:
    DEFAULT_OPTIONS.cachePath = null
}


// Functions
const readFile = (filepath) => new Promise((ok, no) => {
  fs.readFile(filepath, (error, file) => {
    if (error) return no(error)
    ok(file)
  })
})

const listCacheFilenames = (fullpath, blacklist={}) => {
  const filepaths = fs.readdirSync(fullpath, {withFileTypes: 1})
    .filter(dirent => dirent.isFile())
    .filter(dirent => !blacklist[dirent.name])
    .map(dirent => `${ fullpath }/${ dirent.name }`)

  filepaths.pop() // Remove index file (always last)
  
  return filepaths
}

const extractRawHttpHeaders = (buf) => {
  const start = buf.indexOf(Buffer.from('HTTP/1.1'))
  for (let i = start; i < buf.length; i++) {
    if (buf[i] == 0x00 && buf[i+1] == 0x00) {
      const buf2 = Buffer.alloc(i - start)
      buf.copy(buf2, 0, start, i)
      return buf2
    }
  }
  return null
}

const parseHttpReqHeaders = (buf) => {
  const headers = {}
  buf.split('\0').map(line => {
    if (line.indexOf(':') != -1) {
      const lineSplited = line.split(':')
      const key = lineSplited[0]
      const value = lineSplited.slice(1).join(':')
      headers[key] = value
    }
  })
  return headers
}

const parseCachedFile = (buf) => {
  const cachedFileHeadingSize = 24
  const cachedFileHeadingNameSizeOffset = 12
  const cachedFilenameSize = buf.readUInt32LE(cachedFileHeadingNameSizeOffset)
  const cachedFilenameBuf = Buffer.alloc(cachedFilenameSize)
  buf.copy(cachedFilenameBuf, 0, cachedFileHeadingSize, cachedFileHeadingSize + cachedFilenameSize)
  const cachedFilename = cachedFilenameBuf.toString()
  if (buf.indexOf(Buffer.from('HTTP/1.1')) == -1) {
    return { url: cachedFilename }
  }
  const rawHttpReqHeaders = extractRawHttpHeaders(buf).toString()
  const headers = parseHttpReqHeaders(rawHttpReqHeaders)
  const contentLength = parseInt(headers['content-length']) || buf.indexOf(Buffer.from('HTTP/1.1')) - 52 - (cachedFileHeadingSize + cachedFilenameSize)
  const contentOffset = cachedFileHeadingSize + cachedFilename.length
  const contentBuf = Buffer.alloc(contentLength)
  buf.copy(contentBuf, 0, contentOffset, contentOffset + contentLength)
  return { url: cachedFilename, headers, content: contentBuf }
}


// Classes
class ChromeCacheFile {
  constructor(filename, buffer) {
    Object.defineProperty(this, '_', {
      value: {
        filename: filename,
        parsed: parseCachedFile(buffer),
      }
    })

    if (this._.parsed.headers) {
      Object.freeze(this._.parsed.headers)
    }
  }
  get filename() { return this._.filename }
  get url() { return this._.parsed.url }
  get content() { return this._.parsed.content }
  get headers() { return this._.parsed.headers }
}

class ChromeCacheReader {
  constructor(options={}) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options)
    this.knownFilenames = {}
    this.updating = false
    this.queueUpdate = false
    this.db = level(this.options.databasePath)
  }
  get(url) {
    return new Promise((ok, no) => {
      this.db.get(url, (error, filename) => {
        if (error) {
          if (error.notFound) {
            ok(null)
          } else {
            no(error)
          }
        } else {
          readFile(`${ this.options.cachePath }/${ filename }`)
          .then((fileBuf) => ok(new ChromeCacheFile(filename, fileBuf)))
          .catch(no)
        }
      })
    })
  }
  update() {
    if (this.updating) return this.queueUpdate = true
    this.updating = true
    this.queueUpdate = false
    return new Promise((ok, no) => {
      const that = this
      Promise.all(
        listCacheFilenames(this.options.cachePath, this.knownFilenames)
        .map(function(filepath) {
          const filename = path.basename(filepath)
          return new Promise((ok, no) => {
            that.db.get(filename, (error, value) => {
              if (error) {
                if (error.notFound) {
                  // Get Filename & store in db
                  readFile(`${ that.options.cachePath }/${ filename }`)
                  .then(fileBuf => {
                    const chromeCacheFile = new ChromeCacheFile(filename, fileBuf)
                    that.db.batch(
                      [
                        // { type: 'put', key: filename, value: chromeCacheFile.url },
                        { type: 'put', key: chromeCacheFile.url, value: filename },
                      ],
                      error => {
                        if (error) return no(error)
                        that.knownFilenames[filename] = 1
                        ok()
                      }
                    )
                  })
                  .catch(no)
                } else {
                  no(error)
                }
              } else {
                that.knownFilenames[filename] = 1
                ok()
              }
            })
          })
        })
      )
      .then(ok)
      .catch(no)
    })
  }
}

module.exports = ChromeCacheReader
