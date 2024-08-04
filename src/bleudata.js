import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BleuData = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:5000/load_bleu')
            .then(response => {
                setData(response.data);
            })
            .catch(error => {
                console.error('Error fetching the BLEU data:', error);
            });
    }, []);

    return (
        <div>
            <br/>
            <h1>BLEU Scores Evaluation</h1>
            <br/>
            <table>
                <thead>
                    <tr>
                        <th>Language</th>
                        <th>Source</th>
                        <th>Target</th>
                        <th>Reference</th>
                        <th>BLEU Score</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>
                            <td>{row.language}</td>
                            <td>{row.source}</td>
                            <td>{row.target}</td>
                            <td>{row.reference}</td>
                            <td>{row.BLEU_score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default BleuData;
