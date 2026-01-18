// import { DemoCard } from "@/components/DemoCard"
import { Login } from "./components/login/login"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <Login />
      <Toaster position="top-center" richColors />
    </div>
  )
}

export default App
