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
        url: 'https://drive.google.com/file/d/1s1R9I9_M97iFpcxYwwsb490K2puJW4r1/view?usp=sharing',
        key: 'resume',
        icon: BsFileEarmarkPerson
    },
]


export const aboutme = "As a final year B.Tech student in Information Technology at Vellore Institute of Technology, I have a deep passion for backend development and a strong interest in AI and ML. Currently diving into Deep Learning, I eagerly explore new ideas and expand my expertise. Fluent in English, Hindi, Gujarati, and Bengali, engaging with diverse communities and embracing challenges comes naturally. A quick learner and team player, contributing, collaborating, and growing alongside peers is always a priority. Actively seeking opportunities to work on projects that enhance my skills and create a meaningful impact."