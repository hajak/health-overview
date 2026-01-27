import React from 'react'
import { useRouter } from 'next/router'

const Header = () => {
    const router = useRouter();

    const headerMap = {
        "/": "Dashboard",
        "/sleep": "Sleep",
        "/excercise": "Exercise",
        "/activity-overview": "Running & Activity",
        "/lab-results": "Lab Results"
    }

    return (
        <div className='p-1 flex items-center'>
            <h3 className='text-xl font-productSansBold'>{headerMap[router.pathname] || ''}</h3>
        </div>
    )
}

export default Header
