import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PlotBleu = () => {
    const [plotUrl, setPlotUrl] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5001/plot_bleu', { responseType: 'blob' })
            .then(response => {
                console.log(response.data);
                const url = URL.createObjectURL(new Blob([response.data]));
                setPlotUrl(url);
            })
            .catch(error => {
                console.error('Error fetching the plot:', error);
            });
    }, []);

    return (
        <div>
            <br/>
            <h1>BLEU Score Evaluation Graph</h1>
            {plotUrl ? <img src={plotUrl} alt="BLEU Score Evaluation Graph" /> : <p>Loading plot...</p>}
        </div>
    );
}

export default PlotBleu;
