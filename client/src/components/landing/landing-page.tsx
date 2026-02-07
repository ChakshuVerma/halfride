import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  ArrowRight,
  ShieldCheck,
  Leaf,
  Users,
  Search,
  Car,
  Star,
  CheckCircle2,
  Plane,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Texture Overlay - Adds grain to remove 'flatness' */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] mix-blend-multiply bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Car className="w-5 h-5" />
            </div>
            HalfRide
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
            <Button onClick={handleGetStarted} className="rounded-full px-6">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION - Split Layout to fill horizontal space */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Background Blobs */}
          <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/4"></div>
          <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl opacity-50 -translate-x-1/3 translate-y-1/4"></div>

          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              {/* Left: Text Content */}
              <div className="flex flex-col items-start text-left space-y-8 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-secondary-foreground/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live in 5 major airports
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                  Airport rides, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                    better together.
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Stop overpaying for solo cabs. Match with verified travelers
                  on your flight, split the bill, and enjoy the ride.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    className="text-lg px-8 h-14 rounded-full shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-all"
                  >
                    Find a Ride Now
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 h-14 rounded-full bg-background/50 backdrop-blur-sm"
                  >
                    Estimate Savings
                  </Button>
                </div>

                {/* Trust Signals */}
                <div className="pt-8 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 border-background bg-gray-200 flex items-center justify-center overflow-hidden"
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 13}`}
                          alt="User"
                        />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                      +2k
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                    <span>Trusted by smart travelers</span>
                  </div>
                </div>
              </div>

              {/* Right: Visual (CSS App Mockup) */}
              <div className="relative mx-auto w-full max-w-[400px] lg:max-w-full perspective-1000 group">
                {/* Decorative background circle behind phone */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-[80px]"></div>

                {/* Phone Frame */}
                <div className="relative bg-background border border-border shadow-2xl rounded-[3rem] p-4 rotate-[-3deg] group-hover:rotate-0 transition-transform duration-500 ease-out z-10">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-foreground rounded-b-2xl z-20"></div>

                  {/* Phone Screen Content */}
                  <div className="bg-secondary/30 rounded-[2.5rem] overflow-hidden h-[600px] w-full flex flex-col relative">
                    {/* Map Background */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>

                    {/* Header */}
                    <div className="p-6 pt-12 flex justify-between items-center z-10">
                      <div className="bg-background/80 backdrop-blur rounded-full p-2 shadow-sm">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </div>
                      <h3 className="font-semibold">Ride Match</h3>
                      <div className="bg-background/80 backdrop-blur rounded-full p-2 shadow-sm">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="mt-auto p-6 space-y-4 z-10 pb-10">
                      {/* Match Found Card */}
                      <div className="bg-background/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-border/50 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Match Found!</p>
                            <p className="text-xs text-muted-foreground">
                              Sarah is on your flight
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm p-3 bg-secondary rounded-xl">
                          <div className="flex items-center gap-2">
                            <Plane className="w-4 h-4" />
                            <span>BA-249</span>
                          </div>
                          <div className="h-4 w-px bg-border"></div>
                          <div className="font-mono font-bold text-green-600">
                            Save $24.00
                          </div>
                        </div>
                      </div>

                      {/* Button */}
                      <div className="bg-primary text-primary-foreground p-4 rounded-2xl text-center font-bold shadow-lg shadow-primary/25 cursor-pointer">
                        Confirm Ride
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-20 -right-8 md:-right-12 bg-background p-4 rounded-2xl shadow-xl border border-border/50 animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full text-green-600">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Arriving in
                      </p>
                      <p className="font-bold">5 mins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGO STRIP - Fills emptiness between sections */}
        <section className="border-y bg-secondary/20 py-10">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">
              Works seamlessly with flights from
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Placeholders for Airline Logos - using text for now but styled as logos */}
              <span className="text-xl font-black font-serif">
                British Airways
              </span>
              <span className="text-xl font-bold italic">Emirates</span>
              <span className="text-xl font-black tracking-tighter">
                Lufthansa
              </span>
              <span className="text-xl font-bold font-mono">DELTA</span>
              <span className="text-xl font-bold">Ryanair</span>
            </div>
          </div>
        </section>

        {/* FEATURES - Bento Grid Style */}
        <section className="py-24 bg-background relative">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="mb-16 md:text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                More than just a ride.
              </h2>
              <p className="text-lg text-muted-foreground">
                We've re-engineered the airport transfer experience to optimize
                for cost, safety, and comfort.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 - Large */}
              <div className="md:col-span-2 bg-secondary/30 rounded-[2rem] p-8 md:p-12 relative overflow-hidden group hover:bg-secondary/50 transition-colors">
                <div className="relative z-10 max-w-md">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Community First</h3>
                  <p className="text-muted-foreground text-lg">
                    We don't just match destinations; we match people. See
                    verified profiles, LinkedIn connections, and flight details
                    before you say yes.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 group-hover:bg-primary/10 transition-colors"></div>
              </div>

              {/* Feature 2 - Tall */}
              <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Leaf className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary mb-6 shadow-sm">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Eco-Friendly</h3>
                  <p className="text-muted-foreground">
                    Sharing one car instead of two reduces your carbon footprint
                    by 50% instantly.
                  </p>
                </div>
                <div className="mt-8 text-4xl font-bold text-primary/20">
                  -4.2kg CO2
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-background border rounded-[2rem] p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Verified Users</h3>
                <p className="text-muted-foreground">
                  Government ID verification required for all riders.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="md:col-span-2 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] p-8 md:p-12 text-primary-foreground relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="max-w-md">
                    <h3 className="text-2xl font-bold mb-3">Split Payments</h3>
                    <p className="text-primary-foreground/80 text-lg">
                      No awkward cash exchanges. The app handles the fare split
                      automatically when the ride ends.
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 min-w-[200px] text-center">
                    <p className="text-sm font-medium mb-1 opacity-80">
                      Total Fare
                    </p>
                    <p className="text-3xl font-bold">$45.00</p>
                    <div className="my-3 h-px bg-white/20"></div>
                    <div className="flex justify-between text-sm">
                      <span>You pay</span>
                      <span className="font-bold">$22.50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA - Full width with texture */}
        <section className="py-24 px-4 md:px-6">
          <div className="container mx-auto">
            <div className="bg-black text-white rounded-[2.5rem] p-8 md:p-20 text-center relative overflow-hidden isolate">
              {/* Abstract background lines */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-700 via-black to-black"></div>

              <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
                  Ready to take off?
                </h2>
                <p className="text-xl text-gray-400">
                  Join the community of travelers saving money and the planet,
                  one ride at a time.
                </p>
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-white text-black hover:bg-gray-200 text-lg h-14 px-10 rounded-full"
                >
                  Get Started Now
                </Button>
                <p className="text-sm text-gray-500 pt-4">
                  No credit card required for sign up
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-4 max-w-xs">
              <div className="flex items-center gap-2 font-bold text-xl">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                  <Car className="w-4 h-4" />
                </div>
                HalfRide
              </div>
              <p className="text-sm text-muted-foreground">
                The smartest way to get from the runway to your doorway. Safe,
                verified, and affordable.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
              <div className="space-y-3">
                <h4 className="font-semibold">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-primary">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary">
                      Blog
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Support</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-primary">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary">
                      Safety
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary">
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-3 hidden md:block">
                <h4 className="font-semibold">Social</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-primary">
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary">
                      LinkedIn
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t flex justify-between items-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} HalfRide Inc.</p>
            <div className="flex gap-4">
              <span>Made with ♥️ for travelers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
