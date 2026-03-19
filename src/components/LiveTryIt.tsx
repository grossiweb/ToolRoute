'use client'

export function LiveTryIt() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
      <form
        style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg3)', border: '1px solid var(--border-bright)',
          borderRadius: '10px 10px 0 0', overflow: 'hidden',
        }}
        onSubmit={e => e.preventDefault()}
      >
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-3)', padding: '10px 0 10px 12px', whiteSpace: 'nowrap',
        }}>
          GET /api/route?task=
        </span>
        <input
          defaultValue="parse csv"
          spellCheck={false}
          autoComplete="off"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--amber)',
            padding: '10px 6px', flex: 1, minWidth: 60,
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--amber)', color: '#000', border: 'none',
            padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          ↵ Run
        </button>
      </form>
    </div>
  )
}
