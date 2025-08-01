import { Header } from './Header.jsx';
import {Footer} from './Footer.jsx'
import { Outlet } from 'react-router-dom';   //to import children of Applout component

export  function Applayout()
{
    return(
        <>

        <Header/>
        <Outlet/>
        <Footer/>

        </>
    );
}