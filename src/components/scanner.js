import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { db, auth } from '../firebase';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';

function Scanner({ onClose }) {
  const videoRef = useRef(null);
  const [scannedCode, setScannedCode] = useState(null);
  const [error, setError] = useState(null);
  const [manualInput, setManualInput] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    marca: '', 
    tipo: 'licor', 
    subTipo: '', 
    origen: '', 
    stock: 1, 
    umbral_low: 5 
  });
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    const reader = codeReader.current;
    reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        console.log('Código detectado: ', result.text);
        setScannedCode(result.text);
        setManualInput(true); // Activa el formulario manual
      }
      if (err && !(err instanceof NotFoundException)) {
        console.error(err);
        setError('Error en escaneo: ' + err.message);
      }
    }).catch(err => {
      setError('Error inicializando escáner: ' + err.message);
    });

    return () => {
      reader.reset(); // Detiene la cámara al desmontar
    };
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (formData.nombre === '' || (formData.tipo === 'licor' && formData.subTipo === '') || (formData.tipo === 'vino' && formData.origen === '')) {
      setError('Por favor, completa todos los campos requeridos.');
      return;
    }
    try {
      const q = query(collection(db, 'inventario'), where('codigo', '==', scannedCode));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Este item ya existe.');
        return;
      }
      const dataToSave = {
        codigo: scannedCode,
        nombre: formData.nombre,
        tipo: formData.tipo,
        stock: formData.stock,
        umbral_low: formData.umbral_low,
        ultima_actualizacion: new Date()
      };
      if (formData.tipo === 'licor') {
        dataToSave.subTipo = formData.subTipo;
      }
      if (formData.tipo === 'vino' || formData.tipo === 'cerveza') {
        dataToSave.marca = formData.marca;
      }
      if (formData.tipo === 'vino') {
        dataToSave.origen = formData.origen;
      }
      await addDoc(collection(db, 'inventario'), dataToSave);
      await addDoc(collection(db, 'historial'), {
        item_codigo: scannedCode,
        accion: 'agregado',
        cantidad: formData.stock,
        fecha: new Date(),
        usuario: auth.currentUser?.email || 'anonimo'
      });
      console.log('Item agregado a Firestore');
      alert('Item agregado!');
      onClose();
    } catch (err) {
      console.error('Error guardando: ', err);
      setError('Error guardando: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {!manualInput && (
        <div ref={videoRef} style={{ width: '100%', height: '300px' }}></div>
      )}
      {scannedCode && <p>Código escaneado: {scannedCode}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {manualInput && (
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
            <h3>Datos Básicos</h3>
            <div>
              <label>Nombre (incluye marca si es licor, ej: Maker\'s Mark):</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Ej: Maker's Mark" required />
            </div>
            {(formData.tipo === 'vino' || formData.tipo === 'cerveza') && (
              <div>
                <label>Marca:</label>
                <input type="text" name="marca" value={formData.marca} onChange={handleInputChange} placeholder="Ej: Bodega Catena" />
              </div>
            )}
          </div>
          <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
            <h3>Detalles Específicos</h3>
            <div>
              <label>Tipo:</label>
              <select name="tipo" value={formData.tipo} onChange={handleInputChange}>
                <option value="licor">Licor</option>
                <option value="vino">Vino</option>
                <option value="cerveza">Cerveza</option>
              </select>
            </div>
            {formData.tipo === 'licor' && (
              <div>
                <label>Sub-tipo:</label>
                <select name="subTipo" value={formData.subTipo} onChange={handleInputChange} required>
                  <option value="">Selecciona</option>
                  <option value="whiskey">Whiskey</option>
                  <option value="vodka">Vodka</option>
                  <option value="gin">Gin</option>
                  <option value="ron">Ron</option>
                  <option value="tequila">Tequila</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            )}
            {formData.tipo === 'vino' && (
              <div>
                <label>Origen:</label>
                <input type="text" name="origen" value={formData.origen} onChange={handleInputChange} placeholder="Ej: Argentina" required />
              </div>
            )}
          </div>
          <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
            <h3>Cantidades</h3>
            <div>
              <label>Stock (en fracciones, e.g., 0.75 para 3/4 botella):</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" step="0.25" placeholder="Ej: 0.75" required />
            </div>
            <div>
              <label>Umbral Low (en fracciones, e.g., 2.5):</label>
              <input type="number" name="umbral_low" value={formData.umbral_low} onChange={handleInputChange} min="0" step="0.25" placeholder="Ej: 2.5" required />
            </div>
          </div>
          <button type="submit">Guardar</button>
          <button type="button" onClick={onClose}>Cancelar</button>
        </form>
      )}
    </div>
  );
}

export default Scanner;