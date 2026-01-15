import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Project {
  id: number
  name: string
  framework: string
}

export function DemoCard() {
  const [name, setName] = useState("")
  const [framework, setFramework] = useState("")
  const [projects, setProjects] = useState<Project[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, framework }),
      })
      if (response.ok) {
        alert("Project saved successfully!")
        setName("")
        setFramework("")
        // Optional: auto-fetch after save
        fetchProjects() 
      } else {
        alert("Failed to save project.")
      }
    } catch (error) {
      console.error("Error saving project:", error)
      alert("Error saving project.")
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      } else {
        alert("Failed to fetch projects.")
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      alert("Error fetching projects.")
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                placeholder="Name of your project" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="framework">Framework</Label>
              <Input 
                id="framework" 
                placeholder="Select Framework" 
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
              />
            </div>
          </div>
          <CardFooter className="flex justify-between mt-4 px-0 pb-0">
            <Button variant="outline" type="button" onClick={() => { setName(""); setFramework(""); }}>Cancel</Button>
            <Button type="submit">Deploy</Button>
          </CardFooter>
        </form>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold">Existing Projects</h3>
             <Button variant="secondary" size="sm" onClick={fetchProjects}>Fetch</Button>
          </div>
          <div className="space-y-2">
            {projects.length === 0 && <p className="text-sm text-neutral-500">No projects fetched.</p>}
            {projects.map((p) => (
              <div key={p.id} className="text-sm border p-2 rounded bg-neutral-50 dark:bg-neutral-800">
                <span className="font-bold">{p.name}</span> <span className="text-neutral-500">({p.framework})</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
