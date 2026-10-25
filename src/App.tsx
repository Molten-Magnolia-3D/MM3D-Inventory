import { Landing } from './components/Landing'
import { Library } from './components/Library'
import { Studio } from './components/Studio'
import { useStudio } from './store'

export default function App() {
  const { screen, projects, activeId } = useStudio()
  const property = projects.find((project) => project.id === activeId)

  if (screen === 'studio' && property) return <Studio property={property} />
  if (screen === 'library') return <Library />
  return <Landing />
}
