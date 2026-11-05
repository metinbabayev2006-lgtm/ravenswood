import { lazy, Suspense } from 'react'
import FlatBoard from './FlatBoard.jsx'
const ThreeBoard = lazy(() => import('./ThreeBoard.jsx'))
export default function Board(props) {
  return <Suspense fallback={<div className="loading-villa">Die 3D-Villa wird aufgebaut …</div>}><ThreeBoard {...props} fallback={<FlatBoard {...props}/>}/></Suspense>
}
