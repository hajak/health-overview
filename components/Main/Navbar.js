import Link from 'next/link'
import React from 'react'
import { RiHeartPulseFill } from 'react-icons/ri'
import { GiNightSleep } from 'react-icons/gi'
import { MdDashboard } from 'react-icons/md'
import { TbTestPipe } from 'react-icons/tb'
import { SiStrava } from 'react-icons/si'
import { FaApple } from 'react-icons/fa'
import NavLink from './NavLink'

const Navbar = () => {
    return (
        <div className='bg-black flex-[.2] md:h-[100vh] flex items-center md:items-start md:flex-col gap-4 overflow-hidden'>
            <Link href="/">
                <div className='md:w-full md:mt-4 flex gap-2 text-2xl items-center text-white p-4 cursor-pointer'>
                    <RiHeartPulseFill className='text-2xl text-red-500' />
                    <span>Health</span>
                </div>
            </Link>
            <div className="flex md:flex-col ml-auto mr-5 text-white items-center md:items-stretch md:w-full md:gap-4 md:py-4 md:pl-4">
                <NavLink text="Dashboard" address="/" icon={<MdDashboard />} />
                <NavLink text="Running" icon={<SiStrava />} address="/activity-overview" />
                <NavLink text="Apple Health" icon={<FaApple />} address="/apple-health" />
                <NavLink text="Sleep" icon={<GiNightSleep />} address="/sleep" />
                <NavLink text="Lab Results" icon={<TbTestPipe />} address="/lab-results" />
            </div>
        </div>
    )
}

export default Navbar
