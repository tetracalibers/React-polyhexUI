import * as S from 'parser-ts/string'
import * as P from 'parser-ts/Parser'
import * as C from 'parser-ts/char'
import { run } from 'parser-ts/code-frame'
import { pipe } from 'fp-ts/function'

const styp = `<StylePatch>
  <span>
    {{
      backgroundColor: '#1a1a1a',
      borderRadius: '2px',
      color: 'white',
      display: 'inline-block',
      fontSize: '0.8rem',
      padding: '0.4rem 0.5rem',
      position: 'relative',
      __after: {
        borderColor: '#1a1a1a transparent transparent transparent',
        borderStyle: 'solid',
        borderWidth: '3px 3px 0 3px',
        bottom: '0',
        content: '',
        display: 'block',
        height: '0',
        left: '50%',
        position: 'absolute',
        transform: 'translate(-50%, 100%)',
        width: '0',
      },
    }}
  </span>
</StylePatch>
`.replaceAll(/[\r\n\t]/g, '')

interface AstNode {
  readonly kind: string
  readonly value: string
}

const spaceTrim = P.surroundedBy(S.spaces)

const startFile: P.Parser<string, AstNode> = pipe(
  S.string('<StylePatch>'),
  P.map(value => ({
    kind: 'BEGIN_stypFile',
    value: value,
  }))
)

const endFile: P.Parser<string, AstNode> = pipe(
  S.string('</StylePatch>'),
  P.map(value => ({
    kind: 'END_stypFile',
    value: value,
  }))
)

const openingComponentTag: P.Parser<string, AstNode> = pipe(
  P.manyTill(
    pipe(
      C.char('<'),
      P.alt(() => C.letter)
    ),
    C.char('>')
  ),
  P.map(value => {
    return {
      kind: 'OPEN_componentTag',
      value: value.slice(1).join(''),
    }
  })
)

const openingHtmlTag: P.Parser<string, AstNode> = pipe(
  P.manyTill(
    pipe(
      C.char('<'),
      P.alt(() => C.lower)
    ),
    C.char('>')
  ),
  P.map(value => {
    return {
      kind: 'OPEN_htmlTag',
      value: value.slice(1).join(''),
    }
  })
)

const closingTag: P.Parser<string, AstNode> = pipe(
  P.manyTill(
    pipe(
      S.string('</'),
      P.alt(() => C.letter)
    ),
    C.char('>')
  ),
  P.map(value => ({
    kind: 'CLOSE_tag',
    value: value.slice(1).join(''),
  }))
)

const cssProperty: P.Parser<string, AstNode> = pipe(
  P.manyTill(
    pipe(
      C.letter,
      P.alt(() => C.oneOf(["'", '_'].join('')))
    ),
    C.char(':')
  ),
  P.map(value => ({
    kind: 'CSS_property',
    value: value.join(''),
  }))
)

const cssPropertyValue: P.Parser<string, AstNode> = pipe(
  P.manyTill(
    pipe(
      C.alphanum,
      P.alt(() =>
        C.oneOf(
          ["'", '"', ':', '#', '.', '-', '%', ' ', '(', ')', ','].join('')
        )
      )
    ),
    S.string("',")
  ),
  P.map(value => ({
    kind: 'CSS_value',
    value: value.join('').replaceAll(/\'/g, ''),
  }))
)

const startStylePatch: P.Parser<string, AstNode> = pipe(
  S.string('{{'),
  P.map(value => ({
    kind: 'START_css',
    value: value,
  }))
)

const endStylePatch: P.Parser<string, AstNode> = pipe(
  S.string('}}'),
  P.map(value => ({
    kind: 'END_css',
    value: value,
  }))
)

const startNestCss: P.Parser<string, AstNode> = pipe(
  S.string('{'),
  P.map(value => ({
    kind: 'BEGIN_nesting',
    value: value,
  }))
)

const endNestCss: P.Parser<string, AstNode> = pipe(
  S.string('},'),
  P.alt(() => C.char('}')),
  P.map(value => ({
    kind: 'END_nesting',
    value: value.replaceAll(',', ''),
  }))
)

const parser: P.Parser<string, AstNode> = pipe(
  startFile,
  P.alt(() => spaceTrim(endFile)),
  P.alt(() => spaceTrim(openingHtmlTag)),
  P.alt(() => spaceTrim(openingComponentTag)),
  P.alt(() => spaceTrim(closingTag)),
  P.alt(() => spaceTrim(cssProperty)),
  P.alt(() => spaceTrim(cssPropertyValue)),
  P.alt(() => spaceTrim(startStylePatch)),
  P.alt(() => spaceTrim(endStylePatch)),
  P.alt(() => spaceTrim(startNestCss)),
  P.alt(() => spaceTrim(endNestCss)),
  P.map(value => value)
)

export const result = run(P.many(parser), styp)

//new ShellString(jsonFormat(result, config_jsonFormat)).to('tmp/ast.json')
