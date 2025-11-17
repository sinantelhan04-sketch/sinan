import React from 'react';
import { ClockIcon } from './icons';

const OfflineScreen: React.FC = () => {
    return (
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <ClockIcon />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Sistem Çevrimdışı</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
                Tesisat Sorgulama yalnızca çalışma saatlerinde (Hafta içi, 08:00 - 18:00) kullanılabilir.
            </p>
        </div>
    );
};

export default OfflineScreen;