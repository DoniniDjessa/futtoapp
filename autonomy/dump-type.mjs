import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const root = 'D:/DONI/WORK/CLOSE/futtoapp'
const configPath = path.join(root, 'tsconfig.json')
const { config } = ts.readConfigFile(configPath, ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root)

const program = ts.createProgram(parsed.fileNames, parsed.options)
const checker = program.getTypeChecker()
const sf = program.getSourceFile(path.join(root, 'autonomy/probe2.ts'))
if (!sf) {
  console.log('source not found')
  process.exit(1)
}

const flags =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.NoTypeReduction |
  ts.TypeFormatFlags.WriteArrayAsGenericType

function findTypeNode(name) {
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) && st.name.text === name) {
      return st.type
    }
  }
  return undefined
}

// GetProps<typeof YStack> resolution
const ystackTypeNode = findTypeNode('YProps')
if (ystackTypeNode) {
  const t = checker.getTypeFromTypeNode(ystackTypeNode)
  console.log('=== YProps (JSX props = GetProps<typeof YStack>) ===')
  console.log(checker.typeToString(t, undefined, flags).slice(0, 12000))
  console.log('')
  console.log('--- symbol keys ---')
  const props = t.getProperties()
  for (const p of props) {
    const pt = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf)
    console.log(p.name, '::', checker.typeToString(pt, undefined, flags).slice(0, 300))
  }
}