import { createHashRouter } from 'react-router'
import { AppShell } from './AppShell'
import { HomePage } from '../features/home/HomePage'
import { TrainPage } from '../features/train/TrainPage'
import { WorkoutPage } from '../features/workout/WorkoutPage'
import { WorkoutsPage } from '../features/progress/WorkoutsPage'
import { ExercisesPage } from '../features/progress/ExercisesPage'
import { ExerciseHistoryPage } from '../features/progress/ExerciseHistoryPage'
import { BodyPage } from '../features/progress/BodyPage'
import { WorkoutDetailPage } from '../features/history/WorkoutDetailPage'
import { PlanPage } from '../features/plan/PlanPage'
import { RoutineEditorPage } from '../features/plan/RoutineEditorPage'
import { FoodPage } from '../features/nutrition/FoodPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { MuscleTargetsPage } from '../features/settings/MuscleTargetsPage'

// Hash routing works on GitHub Pages without server-side rewrites.
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/train', element: <TrainPage /> },
      { path: '/workout/:id', element: <WorkoutPage /> },
      { path: '/history', element: <WorkoutsPage /> },
      { path: '/history/exercises', element: <ExercisesPage /> },
      { path: '/history/body', element: <BodyPage /> },
      { path: '/exercise/:id', element: <ExerciseHistoryPage /> },
      { path: '/history/:id', element: <WorkoutDetailPage /> },
      { path: '/plan', element: <PlanPage /> },
      { path: '/plan/routine/:id', element: <RoutineEditorPage /> },
      { path: '/food', element: <FoodPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/muscles', element: <MuscleTargetsPage /> },
    ],
  },
])
