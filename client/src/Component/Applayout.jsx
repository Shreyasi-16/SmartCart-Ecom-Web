import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { Outlet } from 'react-router-dom';

export function Applayout() {
    const layoutStyle = {
        backgroundColor: '#d0c9a9ff', 
        minHeight: '100vh',         // full height
        display: 'flex',
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
