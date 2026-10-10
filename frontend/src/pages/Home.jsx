function Home() {
  return (
    <main>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#f7f1e8]">
        <div className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8">

          <div>

            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-[#b84a2f]">
              The Cravings Cafe
            </p>

            <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-[#171717] sm:text-6xl lg:text-7xl">
              Your Pit Stop
              <br />
              For Hungry Miles.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-[#665b53]">
              Good food, refreshing drinks and the perfect place to pause,
              relax and satisfy your cravings.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">

              <a
                href="/menu"
                className="rounded-full bg-[#b84a2f] px-7 py-3.5 font-semibold text-white transition hover:bg-[#963a24]"
              >
                Explore Menu
              </a>

              <a
                href="/booking"
                className="rounded-full border border-[#b9aa9b] px-7 py-3.5 font-semibold text-[#171717] transition hover:bg-[#171717] hover:text-white"
              >
                Book a Table
              </a>

            </div>

          </div>

          {/* Visual */}
          <div className="relative">

            <div className="aspect-square overflow-hidden rounded-[2rem] bg-[#dfc7aa] shadow-2xl">

              <div className="flex h-full items-center justify-center p-10 text-center">

                <div>

                  <div className="text-7xl">
                    ☕
                  </div>

                  <p className="mt-6 text-2xl font-black text-[#171717]">
                    Eat.
                    <br />
                    Sip.
                    <br />
                    Relax.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* Quick Features */}
      <section className="bg-[#171717] py-16 text-white">

        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-3 lg:px-8">

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#d98b6f]">
              Fresh
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Made to Order
            </h2>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#d98b6f]">
              Easy
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Order Online
            </h2>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#d98b6f]">
              Local
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Visit Our Cafe
            </h2>
          </div>

        </div>

      </section>

    </main>
  );
}

export default Home;
<section className="popular-section">
  <div className="section-heading">
    <p className="section-label">OUR FAVOURITES</p>

    <h2>Popular Picks</h2>

    <p>
      A few of the cravings our customers keep coming back for.
    </p>
  </div>

  <div className="food-grid">

    <div className="food-card">
      <div className="food-image">🌯</div>

      <div className="food-content">
        <span>BESTSELLER</span>
        <h3>Paneer Shawarma</h3>
        <p>
          Creamy paneer, fresh vegetables and delicious sauces
          wrapped in warm bread.
        </p>

        <div className="food-bottom">
          <strong>₹120</strong>
          <button>+</button>
        </div>
      </div>
    </div>


    <div className="food-card">
      <div className="food-image">🍔</div>

      <div className="food-content">
        <span>FAVOURITE</span>
        <h3>Classic Burger</h3>
        <p>
          A juicy burger layered with fresh vegetables,
          cheese and our special sauce.
        </p>

        <div className="food-bottom">
          <strong>₹149</strong>
          <button>+</button>
        </div>
      </div>
    </div>


    <div className="food-card">
      <div className="food-image">🍟</div>

      <div className="food-content">
        <span>CRISPY</span>
        <h3>Loaded Fries</h3>
        <p>
          Crispy golden fries loaded with cheese and
          delicious toppings.
        </p>

        <div className="food-bottom">
          <strong>₹99</strong>
          <button>+</button>
        </div>
      </div>
    </div>


    <div className="food-card">
      <div className="food-image">🥤</div>

      <div className="food-content">
        <span>REFRESHING</span>
        <h3>Cold Coffee</h3>
        <p>
          Smooth, creamy and chilled coffee made for
          your perfect cafe break.
        </p>

        <div className="food-bottom">
          <strong>₹89</strong>
          <button>+</button>
        </div>
      </div>
    </div>

  </div>

  <div className="menu-button-wrapper">
    <button className="view-menu-button">
      View Full Menu →
    </button>
  </div>
</section>