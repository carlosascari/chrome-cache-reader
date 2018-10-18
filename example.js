const os = require('os')
const ChromeCacheReader = require('./index')

const options = {
  databasePath: './database',
  cachePath: `${ os.homedir() }/.cache/chromium/Default/Cache`,
}

const reader = new ChromeCacheReader()

reader.update(options)
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
