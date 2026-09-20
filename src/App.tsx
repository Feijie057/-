import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Studio } from '@/pages/Studio'
import { Recipes } from '@/pages/Recipes'
import { LibraryPage } from '@/pages/Library'
import { Assets } from '@/pages/Assets'
import { Models } from '@/pages/Models'
import { Jobs } from '@/pages/Jobs'
import { Settings } from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="studio" element={<Studio />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="assets" element={<Assets />} />
        <Route path="models" element={<Models />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
