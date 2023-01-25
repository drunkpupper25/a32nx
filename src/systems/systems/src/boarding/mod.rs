use crate::simulation::{
    Read, Reader, SimulationElement, SimulationElementVisitor, SimulatorReader, SimulatorWriter,
    VariableIdentifier, Write, Writer,
};
use approx::relative_eq;

#[derive(Debug)]
pub struct PaxSync {
    pax_target_id: VariableIdentifier,
    pax_id: VariableIdentifier,
    per_pax_weight_id: VariableIdentifier,
    unit_convert_id: VariableIdentifier,
    payload_id: VariableIdentifier,

    per_pax_weight: f64,
    unit_convert: f64,
    pax_target: u64,
    pax: u64,
    payload: f64,
}
impl PaxSync {
    pub fn new(
        pax_id: VariableIdentifier,
        pax_target_id: VariableIdentifier,
        per_pax_weight_id: VariableIdentifier,
        unit_convert_id: VariableIdentifier,
        payload_id: VariableIdentifier,
    ) -> Self {
        PaxSync {
            pax_id,
            pax_target_id,
            per_pax_weight_id,
            unit_convert_id,
            payload_id,
            per_pax_weight: 0.0,
            unit_convert: 0.0,
            pax_target: 0,
            pax: 0,
            payload: 0.0,
        }
    }

    pub fn pax_is_target(&self) -> bool {
        self.pax == self.pax_target
    }

    pub fn payload_is_sync(&self) -> bool {
        self.pax_num() as f64 * self.per_pax_weight / self.unit_convert == self.payload
    }

    pub fn pax(&self) -> u64 {
        self.pax
    }

    pub fn pax_num(&self) -> i8 {
        self.pax.count_ones() as i8
    }

    pub fn pax_target_num(&self) -> i8 {
        self.pax_target.count_ones() as i8
    }

    pub fn payload(&self) -> f64 {
        self.payload
    }

    pub fn load_payload(&mut self) {
        self.payload = self.pax_num() as f64 * self.per_pax_weight / self.unit_convert;
    }

    pub fn move_all_pax(&mut self) {
        self.pax = self.pax_target;
        self.load_payload();
    }

    pub fn move_one_pax(&mut self) {
        let pax_diff = self.pax_target_num() - self.pax_num();

        if pax_diff > 0 {
            // Union of empty active and filled desired
            // XOR to add right most bit
            let n = !self.pax & self.pax_target;
            if n > 0 {
                let mask = n ^ (n & (n - 1));
                self.pax ^= mask;
            }
        } else if pax_diff < 0 {
            // Union of filled active and empty desired
            // Remove right most bit
            let n = self.pax & !self.pax_target;
            if n > 0 {
                self.pax = n & (n - 1);
            }

            // let n = self.pax.reverse_bits() & !self.pax_target.reverse_bits();
            // self.pax = (n & (n - 1)).reverse_bits();
        } else {
            // Union of filled active and empty desired
            // XOR to disable right most bit
            let n = self.pax & !self.pax_target;
            if n > 0 {
                let mask = n ^ (n & (n - 1));
                self.pax ^= mask;
            }
        }
        self.load_payload();
    }
}
impl SimulationElement for PaxSync {
    fn read(&mut self, reader: &mut SimulatorReader) {
        self.pax = reader.read(&self.pax_id);
        self.pax_target = reader.read(&self.pax_target_id);
        self.per_pax_weight = reader.read(&self.per_pax_weight_id);
        self.unit_convert = reader.read(&self.unit_convert_id);
        self.payload = reader.read(&self.payload_id);
    }
    fn write(&self, writer: &mut SimulatorWriter) {
        writer.write(&self.pax_id, self.pax);
        writer.write(&self.payload_id, self.payload);
        // writer.write(&self.pax_target_id, self.pax_target);
    }
}

#[derive(Debug)]
pub struct CargoSync {
    cargo_target_id: VariableIdentifier,
    cargo_id: VariableIdentifier,
    payload_id: VariableIdentifier,
    unit_convert_id: VariableIdentifier,
    cargo: f64,
    cargo_target: f64,
    payload: f64,
    unit_convert: f64,
}
impl CargoSync {
    pub fn new(
        cargo_id: VariableIdentifier,
        cargo_target_id: VariableIdentifier,
        unit_convert_id: VariableIdentifier,
        payload_id: VariableIdentifier,
    ) -> Self {
        CargoSync {
            cargo_id,
            cargo_target_id,
            unit_convert_id,
            payload_id,
            cargo: 0.0,
            cargo_target: 0.0,
            payload: 0.0,
            unit_convert: 0.0,
        }
    }

    pub fn cargo(&self) -> f64 {
        self.cargo
    }

    pub fn payload(&self) -> f64 {
        self.payload
    }

    pub fn unit_convert(&self) -> f64 {
        self.unit_convert
    }

    pub fn cargo_is_target(&self) -> bool {
        relative_eq!(self.cargo, self.cargo_target)
    }

    pub fn payload_is_sync(&self) -> bool {
        relative_eq!(self.cargo, self.payload * self.unit_convert)
    }

    pub fn load_payload(&mut self) {
        self.payload = self.cargo / self.unit_convert;
    }

    pub fn move_all_cargo(&mut self) {
        self.cargo = self.cargo_target;
        self.load_payload();
    }

    pub fn move_one_cargo(&mut self) {
        let cargo_delta = f64::abs(self.cargo_target - self.cargo);

        if self.cargo < self.cargo_target {
            self.cargo += f64::min(cargo_delta, 60.0);
        } else if self.cargo > self.cargo_target {
            self.cargo -= f64::min(cargo_delta, 60.0);
        }
        self.load_payload();
    }
}
impl SimulationElement for CargoSync {
    fn accept<T: SimulationElementVisitor>(&mut self, visitor: &mut T) {
        visitor.visit(self);
    }
    fn read(&mut self, reader: &mut SimulatorReader) {
        self.cargo = reader.read(&self.cargo_id);
        self.cargo_target = reader.read(&self.cargo_target_id);
        self.unit_convert = reader.read(&self.unit_convert_id);
        self.payload = reader.read(&self.payload_id);
    }
    fn write(&self, writer: &mut SimulatorWriter) {
        writer.write(&self.cargo_id, self.cargo);
        writer.write(&self.payload_id, self.payload);
        // writer.write(&self.cargo_target_id, self.cargo_target);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BoardingRate {
    Instant,
    Fast,
    Real,
}
read_write_enum!(BoardingRate);
impl From<f64> for BoardingRate {
    fn from(value: f64) -> Self {
        match value as u8 {
            2 => BoardingRate::Real,
            1 => BoardingRate::Fast,
            0 => BoardingRate::Instant,
            _ => panic!("{} cannot be converted into BoardingRate", value),
        }
    }
}
