import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { BsFileEarmarkPerson } from 'react-icons/bs';
import type { IconType } from 'react-icons';

export const navlinks = [
    {
        name: 'Home',
        url: '/'
    },
    {
        name: 'Projects',
        url: '/projects'
    },
    {
        name: 'Publications',
        url: '/publications'
    },

]

export const socials: {
    name: string;
    url: string;
    key: string;
    icon: IconType;
}[] = [
    {
        name: 'GitHub',
        url: 'https://github.com/miit-daga',
        key: 'github',
        icon: FaGithub
    },
    {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com/in/miit-daga',
        key: 'linkedin',
        icon: FaLinkedin 
    },
    {
        name: 'Resume',
        // The on-site resume page (app/resume); the Drive file is set in lib/resume.ts
        url: '/resume',
        key: 'resume',
        icon: BsFileEarmarkPerson
    },
]


export const aboutme = "I’m a software development engineer who loves backend development, with a B.Tech in Information Technology from VIT. I’m also into AI and ML on the side, exploring Deep Learning lately, and I’m happiest turning ideas into systems people use. I speak English, Hindi, Gujarati and Bengali, and I learn fast and work best alongside a team."