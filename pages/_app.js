import '../styles/globals.css'
import { RecoilRoot } from 'recoil'
import Container from '../components/Main/Container'

function MyApp({ Component, pageProps }) {
  if (Component.getLayout) {
    return Component.getLayout(<Component {...pageProps} />)
  }

  return (
    <RecoilRoot>
      <Container>
        <Component {...pageProps} />
      </Container>
    </RecoilRoot>
  )
}

export default MyApp
