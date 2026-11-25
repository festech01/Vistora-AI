import type {Metadata} from 'next'
import './style.css'
export const metadata: Metadata={title:'Vistora AI · Creative studio',description:'Plan a video, add pictures and make a voice recording in one studio.',robots:{index:false,follow:false}}
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
