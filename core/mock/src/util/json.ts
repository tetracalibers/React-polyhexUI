import shell from 'shelljs'
const { ShellString } = shell
import jsonFormat from 'json-format'
const config_jsonFormat = {
  type: 'space',
  size: 2,
}

export const toJson = (source: object) => jsonFormat(source, config_jsonFormat)

export const logJson = (source: object) => {
  console.log(toJson(source))
}

export const dumpJson = (source: string) => (filePath: string) => {
  new ShellString(source).to(filePath)
}
