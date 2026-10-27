import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('ReadingBlu error:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 text-center text-ink">
        <h1 className="text-3xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 max-w-sm font-semibold text-ink-soft">
          Sorry about that. Please reload the page. If it keeps happening, email support@readingblu.com.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-6 rounded-full bg-lime px-6 py-3 font-extrabold shadow-[0_4px_0_0_#0b1f4b]"
        >
          Reload ReadingBlu
        </button>
      </div>
    )
  }
}