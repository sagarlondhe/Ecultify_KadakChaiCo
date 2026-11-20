export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-chai-950 text-cream-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-36 -top-40 h-[34rem] w-[34rem] rounded-full border border-cream-100/10 sm:right-[-8rem] sm:top-[-18rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-[26rem] w-[26rem] rounded-full border border-cream-100/10 sm:right-[-4rem] sm:top-[-12rem]"
      />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <a
          href="#top"
          aria-label="Kadak Chai Co. home"
          className="flex items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron-300"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-saffron-300/70 font-serif text-xl font-bold text-saffron-200">
            K
          </span>
          <span>
            <span className="block font-serif text-lg font-semibold leading-5">
              Kadak Chai Co.
            </span>
            <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.2em] text-chai-300">
              Brew a little closer
            </span>
          </span>
        </a>
        <a
          href="#share"
          className="rounded-full border border-cream-100/30 px-4 py-2 text-xs font-semibold tracking-wide text-cream-100 transition hover:border-saffron-300 hover:text-saffron-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron-300 sm:px-5 sm:text-sm"
        >
          Share your story
        </a>
      </header>

      <div
        id="top"
        className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14 md:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-16"
      >
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-saffron-300/30 bg-saffron-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-saffron-200">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-saffron-300" />
            A celebration of everyday togetherness
          </p>
          <h1 className="mt-7 max-w-2xl font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-cream-50 sm:text-6xl lg:text-7xl">
            Every chai break
            <span className="block text-saffron-300">has a story.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-chai-200 sm:text-lg sm:leading-8">
            From the first sip of the morning to one last cup with a friend,
            chai makes room for the moments that matter. What’s your
            #MyChaiBreak?
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#share"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-saffron-300 px-6 py-3 text-sm font-bold text-chai-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-saffron-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron-200"
            >
              Tell us your story
              <span aria-hidden="true" className="text-lg">→</span>
            </a>
            <span className="text-sm text-chai-300">A small pause. A big feeling.</span>
          </div>
        </div>

        <div
          role="img"
          aria-label="A warm cup of chai ready for a break"
          className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center sm:h-80 md:h-[25rem]"
        >
          <div aria-hidden="true" className="absolute h-56 w-56 rounded-full bg-saffron-300/10 blur-2xl sm:h-72 sm:w-72" />
          <div aria-hidden="true" className="absolute bottom-8 h-5 w-56 rounded-[50%] bg-black/30 blur-md sm:bottom-10 sm:w-64" />
          <div aria-hidden="true" className="chai-steam chai-steam-one absolute left-[38%] top-8 h-20 w-8 rounded-full border-l-2 border-cream-100/60 sm:top-10" />
          <div aria-hidden="true" className="chai-steam chai-steam-two absolute left-1/2 top-1 h-24 w-8 rounded-full border-l-2 border-saffron-200/70" />
          <div aria-hidden="true" className="chai-steam chai-steam-three absolute right-[34%] top-10 h-16 w-8 rounded-full border-l-2 border-cream-100/50 sm:top-12" />
          <div aria-hidden="true" className="relative mt-14 h-36 w-48 rounded-b-[4.5rem] rounded-t-[1.3rem] border-4 border-cream-100/90 bg-gradient-to-br from-saffron-200 via-saffron-500 to-chai-700 shadow-[inset_-18px_-8px_28px_rgba(55,28,19,0.32),0_24px_40px_rgba(0,0,0,0.28)] sm:mt-16 sm:h-44 sm:w-56">
            <span className="absolute -right-12 top-7 h-20 w-16 rounded-r-full border-[10px] border-l-0 border-cream-100/90 sm:-right-14 sm:h-24 sm:w-20" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-4xl font-bold text-cream-50/90 sm:text-5xl">
              चाय
            </span>
            <span className="absolute -bottom-5 left-1/2 h-3 w-44 -translate-x-1/2 rounded-[50%] border-b-4 border-cream-100/70 sm:w-52" />
          </div>
          <span className="absolute bottom-3 left-3 rotate-[-8deg] rounded-full border border-cream-100/20 bg-chai-900/70 px-4 py-2 font-serif text-sm italic text-cream-100 sm:bottom-8 sm:left-2">
            made for the moment
          </span>
        </div>
      </div>

      <div className="relative border-t border-cream-100/10 bg-chai-900/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-chai-300 sm:gap-x-14 sm:px-8 sm:text-xs">
          <span>Good chai</span>
          <span aria-hidden="true" className="text-saffron-400">✳</span>
          <span>Good company</span>
          <span aria-hidden="true" className="text-saffron-400">✳</span>
          <span>Good stories</span>
        </div>
      </div>
    </section>
  );
}
