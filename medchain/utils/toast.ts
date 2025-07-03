import { toast, TypeOptions } from 'react-toastify';

export function print(_message: string, _type: TypeOptions, onClose: () => void) {
    toast(_message, {
        type: _type,
        position: "top-center",
        onClose,
        autoClose: 1000
    });
}