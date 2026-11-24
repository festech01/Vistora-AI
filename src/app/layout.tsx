import type {Metadata} from 'next'
import './style.css'
export const metadata: Metadata={title:'Vistora AI · Creative studio',description:'Plan, direct and produce short-form content in one creative workspace.',robots:{index:false,follow:false}}
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
