import React from 'react'
import Navbar from './Navbar'
import Header from './Header'

const Container = ({ children }) => {
    return (
        <div className='flex flex-col md:flex-row md:h-[100vh] h-auto w-full bg-black'>
            <Navbar />
            <div className='flex-1 bg-black px-4 pb-4 md:p-4'>
                <div className='bg-white/95 rounded-xl flex flex-col gap-2 w-full p-4 h-full md:rounded-[20px] overflow-y-auto'>
                    <Header />
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Container
