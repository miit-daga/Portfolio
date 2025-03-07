import React from 'react'

const Heading = ({ text = "Projects" }) => {
  return (
    <h1 className='py-10 text-center text-4xl font-extrabold md:text-6xl lg:text-8xl'>
      {text}
    </h1>

  )
}

export default Heading