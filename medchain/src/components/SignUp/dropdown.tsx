import React from 'react'

interface DropdownProps{
  className: string,
  color: string,
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
  value: string,
}
const Dropdown: React.FC<DropdownProps> = ({
  className,
  color,
  onChange,
  value,
}) => {
  return (
    <select 
      className={className} 
      style={{backgroundColor: color}} 
      onChange={onChange}
      value={value || ''}
    >
        <option value="" disabled>Select Role</option>
        <option value="Patient">Patient</option>
        <option value="HealthcareProvider">Healthcare Provider</option>
        <option value="Insurer">Insurer</option>
        <option value="Admin">Admin</option>
    </select>
  )
}

export default Dropdown;
