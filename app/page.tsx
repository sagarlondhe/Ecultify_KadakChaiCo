import HeroSection from '@/components/campaign/HeroSection';
import StoryForm from '@/components/campaign/StoryForm';

export default function HomePage() {
  return (
    <main>
      <HeroSection />

      <section
        id="share"
        className="scroll-mt-8 bg-cream-100 px-5 py-16 sm:px-8 sm:py-20 lg:py-24"
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
          <div className="lg:sticky lg:top-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-chai-700">
              Your moment, your words
            </p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-chai-950 sm:text-5xl">
              The best stories happen between sips.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-chai-800">
              A shared flask on the train. That five-minute reset with your
              favourite colleague. Tell us about the little chai break you
              still remember.
            </p>

            <div className="mt-9 space-y-5">
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-200 font-serif text-lg font-bold text-chai-900">
                  1
                </span>
                <div>
                  <h3 className="font-semibold text-chai-950">Tell it your way</h3>
                  <p className="mt-1 text-sm leading-6 text-chai-700">
                    Keep it real, keep it yours. Your story can be 10–300
                    characters.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-200 font-serif text-lg font-bold text-chai-900">
                  2
                </span>
                <div>
                  <h3 className="font-semibold text-chai-950">
                    We’ll take a look
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-chai-700">
                    Every story is reviewed before it can appear in the
                    campaign.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-9 border-l-2 border-saffron-500 pl-4 font-serif text-lg italic leading-7 text-chai-800">
              “Chai is a little pause that brings us back to each other.”
            </p>
          </div>

          <div className="rounded-[2rem] border border-chai-200/80 bg-white p-5 shadow-[0_24px_70px_-38px_rgba(55,28,19,0.42)] sm:p-9">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-saffron-700">
                Join the conversation
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-chai-950">
                Share your chai break
              </h2>
              <p className="mt-2 text-sm leading-6 text-chai-700">
                A few details, a little story, and you’re part of
                #MyChaiBreak.
              </p>
            </div>
            <StoryForm />
          </div>
        </div>
      </section>

      <footer className="bg-chai-950 px-5 py-8 text-center text-sm text-chai-200 sm:px-8">
        <p className="font-serif text-lg text-cream-100">Kadak Chai Co.</p>
        <p className="mt-1">Every chai break has a story. #MyChaiBreak</p>
      </footer>
    </main>
  );
}
