import {Header} from './Header.jsx';
import { Footer } from './Footer.jsx';
import { Outlet } from 'react-router-dom';

export function Applayout() {
    const layoutStyle = {       
        minHeight: '100vh',         // full height
        display: 'flex',
        margin:0,
        padding:0,
        flexDirection: 'column'
    };

    return (
        <div style={layoutStyle}>
            <Header />
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
            <Footer />
        </div>
    );
}
