import type {NextPage} from 'next'
import dynamic from "next/dynamic";

const App = dynamic(() => import('../src/pages/home'), {ssr: false})

const Home: NextPage = () => {
    return (
        <div>
            <App/>
        </div>
    )
}

export default Home
