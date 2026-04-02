'use client'

import { useState } from 'react'
import { Brain, TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw } from 'lucide-react'

const SentimentAnalysis = ({ reviews, isFashion = false }) => {
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const analyzeSentiment = async () => {
        if (!reviews || reviews.length === 0) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/sentiment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviews }),
            })

            if (!response.ok) {
                throw new Error('Failed to analyze sentiment')
            }

            const data = await response.json()
            setAnalysis(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getSentimentColor = (sentiment) => {
        switch (sentiment) {
            case 'Positive':
                return isFashion ? 'text-[#8B6914] bg-[#8B6914]/20 border-[#8B6914]/40' : 'text-teal-400 bg-teal-500/20 border-teal-500/40'
            case 'Negative':
                return 'text-red-400 bg-red-500/20 border-red-500/40'
            case 'Mixed':
                return 'text-amber-400 bg-amber-500/20 border-amber-500/40'
            default:
                return 'text-zinc-400 bg-zinc-500/20 border-zinc-500/40'
        }
    }

    const getSentimentIcon = (sentiment) => {
        switch (sentiment) {
            case 'Positive':
                return <TrendingUp className="size-5" />
            case 'Negative':
                return <TrendingDown className="size-5" />
            default:
                return <Minus className="size-5" />
        }
    }

    const getScoreColor = (score) => {
        if (score >= 70) return isFashion ? 'bg-[#8B6914]' : 'bg-teal-500'
        if (score >= 40) return 'bg-amber-500'
        return 'bg-red-500'
    }

    if (!reviews || reviews.length === 0) {
        return null
    }

    return (
        <div className={`rounded-xl border backdrop-blur-sm p-6 shadow-xl ${isFashion ? 'border-[#d4c4a8]/40 bg-white shadow-[#8B6914]/5' : 'border-zinc-700/80 bg-zinc-900/60 shadow-black/20'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Brain className={`size-5 ${isFashion ? 'text-[#8B6914]' : 'text-teal-400'}`} />
                    <h3 className={`font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>AI Sentiment Analysis</h3>
                    <Sparkles className={`size-4 ${isFashion ? 'text-[#8B6914]/80' : 'text-teal-500/80'}`} />
                </div>
                <button
                    onClick={analyzeSentiment}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95 shadow-lg ${isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] text-white shadow-[#8B6914]/20' : 'bg-teal-400 hover:bg-teal-300 text-zinc-900 shadow-teal-500/20'}`}
                >
                    {loading ? (
                        <>
                            <RefreshCw className="size-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Brain className="size-4" />
                            {analysis ? 'Re-analyze' : 'Analyze Reviews'}
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="p-3 mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
                    {error}
                </div>
            )}

            {analysis && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getSentimentColor(analysis.sentiment)}`}>
                            {getSentimentIcon(analysis.sentiment)}
                            <span className="font-semibold">{analysis.sentiment}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Sentiment Score:</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-32 h-2 rounded-full overflow-hidden ${isFashion ? 'bg-[#d4c4a8]/40' : 'bg-zinc-700'}`}>
                                    <div
                                        className={`h-full ${getScoreColor(analysis.score)} transition-all duration-500`}
                                        style={{ width: `${analysis.score}%` }}
                                    />
                                </div>
                                <span className={`font-bold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>{analysis.score}/100</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30' : 'bg-zinc-800/80 border border-zinc-700'}`}>
                        <p className={`leading-relaxed ${isFashion ? 'text-[#8B7355]' : 'text-zinc-300'}`}>{analysis.summary}</p>
                    </div>

                    {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                        <div>
                            <h4 className={`text-sm font-medium mb-2 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Key Insights:</h4>
                            <ul className="space-y-2">
                                {analysis.keyPoints.map((point, index) => (
                                    <li key={index} className={`flex items-start gap-2 text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                                        <span className={`mt-0.5 ${isFashion ? 'text-[#8B6914]' : 'text-teal-400'}`}>•</span>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className={`text-xs pt-2 border-t ${isFashion ? 'text-[#8B7355]/60 border-[#d4c4a8]/30' : 'text-zinc-500 border-zinc-700'}`}>
                        Based on {analysis.reviewCount} review{analysis.reviewCount !== 1 ? 's' : ''} • Powered by AI
                    </p>
                </div>
            )}

            {!analysis && !loading && (
                <p className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>
                    Click the button above to get AI-powered insights from {reviews.length} customer review{reviews.length !== 1 ? 's' : ''}.
                </p>
            )}
        </div>
    )
}

export default SentimentAnalysis
