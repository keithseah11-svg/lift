import { createHashRouter } from 'react-router'
import { AppShell } from './AppShell'
import { HomePage } from '../features/home/HomePage'
import { TrainPage } from '../features/train/TrainPage'
import { WorkoutPage } from '../features/workout/WorkoutPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { WorkoutDetailPage } from '../features/history/WorkoutDetailPage'
import { PlanPage } from '../features/plan/PlanPage'
import { RoutineEditorPage } from '../features/plan/RoutineEditorPage'
import { FoodPage } from '../features/nutrition/FoodPage'
import { SettingsPage } from '../features/settings/SettingsPage'

// Hash routing works on GitHub Pages without server-side rewrites.
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/train', element: <TrainPage /> },
      { path: '/workout/:id', element: <WorkoutPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/history/:id', element: <WorkoutDetailPage /> },
      { path: '/plan', element: <PlanPage /> },
      { path: '/plan/routine/:id', element: <RoutineEditorPage /> },
      { path: '/food', element: <FoodPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
