import { DiffOp } from '@/lib/types'

interface DiffDisplayProps {
  ops: DiffOp[]
}

export default function DiffDisplay({ ops }: DiffDisplayProps) {
  if (!ops || ops.length === 0) {
    return (
      <p className="prose-serif text-muted italic">
        No differences found between these editions for this paragraph.
      </p>
    )
  }

  return (
    <p className="prose-serif leading-[1.85]">
      {ops.map((op, i) => {
        if (op.type === 'equal') {
          return <span key={i}>{op.text}</span>
        }
        if (op.type === 'insert') {
          return (
            <ins
              key={i}
              className="no-underline bg-ins-bg text-ins-text rounded-sm px-0.5"
              title="Added in this edition"
            >
              {op.text}
            </ins>
          )
        }
        // delete
        return (
          <del
            key={i}
            className="bg-del-bg text-del-text rounded-sm px-0.5"
            title="Removed in this edition"
          >
            {op.text}
          </del>
        )
      })}
    </p>
  )
}
