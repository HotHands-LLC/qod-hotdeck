import { supabaseAdmin } from '@/lib/supabase'
import QuestionForm from '@/components/QuestionForm'
import CategoryBrowser from '@/components/CategoryBrowser'
import Link from 'next/link'

async function getYesterdaysWinner() {
  try {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().split('T')[0]

    const { data } = await supabaseAdmin
      .from('qod_questions')
      .select('id, question')
      .eq('date_key', yesterday)
      .or('is_winner.eq.true,is_featured.eq.true')
      .order('vote_count', { ascending: false })
      .limit(1)
      .single()

    return data
  } catch {
    return null
  }
}

export default async function Home() {
  const winner = await getYesterdaysWinner()

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      {/* Wordmark */}
      <div className="mb-12 text-center mt-8">
        <p className="text-[#2a2826] text-xs uppercase tracking-[0.3em]">Ask Que</p>
      </div>

      {/* The question input */}
      <QuestionForm />

      {/* Category browser — client component, self-hides if no questions today */}
      <CategoryBrowser />

      {/* Yesterday's winner */}
      {winner && (
        <div className="mt-16 text-center">
          <p className="text-[#2a2826] text-xs uppercase tracking-widest mb-2">Yesterday</p>
          <Link
            href={`/question/${winner.id}`}
            className="text-[#3d3a35] text-sm hover:text-[#6b6458] transition-colors duration-200 italic"
          >
            &ldquo;{winner.question}&rdquo;
          </Link>
        </div>
      )}
    </main>
  )
}
