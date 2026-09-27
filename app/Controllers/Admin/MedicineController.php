<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Medicine;

class MedicineController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $medicineModel = new Medicine();
        $medicines = $medicineModel->all('name ASC');

        $this->view('admin/medicines/index', [
            'pageTitle' => 'Quản lý kho dược & Danh mục thuốc',
            'medicines' => $medicines
        ], 'layouts/admin');
    }

    public function create(): void {
        Auth::requireRole('admin');
        $this->view('admin/medicines/form', [
            'pageTitle' => 'Thêm loại thuốc mới',
            'medicine' => null
        ], 'layouts/admin');
    }

    public function store(): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'code' => 'required|unique:medicines,code',
            'name' => 'required|min:2',
            'unit' => 'required',
            'unit_price' => 'required|numeric',
            'stock_quantity' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/medicines/create');
            return;
        }

        $medModel = new Medicine();
        $medModel->create([
            'code' => strtoupper($this->request->input('code')),
            'name' => $this->request->input('name'),
            'category' => $this->request->input('category', 'Thuốc thông thường'),
            'unit' => $this->request->input('unit', 'Viên'),
            'unit_price' => (float)$this->request->input('unit_price'),
            'stock_quantity' => (int)$this->request->input('stock_quantity', 100),
            'usage_instruction' => $this->request->input('usage_instruction'),
            'status' => $this->request->input('status', 'active')
        ]);

        Session::flash('success', 'Thêm thuốc vào kho thành công!');
        $this->redirect('/admin/medicines');
    }

    public function edit(int $id): void {
        Auth::requireRole('admin');

        $medModel = new Medicine();
        $medicine = $medModel->find($id);

        if (!$medicine) {
            Response::error(404);
            return;
        }

        $this->view('admin/medicines/form', [
            'pageTitle' => 'Chỉnh sửa thông tin thuốc: ' . $medicine['name'],
            'medicine' => $medicine
        ], 'layouts/admin');
    }

    public function update(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'code' => "required|unique:medicines,code,{$id}",
            'name' => 'required|min:2',
            'unit' => 'required',
            'unit_price' => 'required|numeric',
            'stock_quantity' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/medicines/edit/' . $id);
            return;
        }

        $medModel = new Medicine();
        $medModel->update($id, [
            'code' => strtoupper($this->request->input('code')),
            'name' => $this->request->input('name'),
            'category' => $this->request->input('category'),
            'unit' => $this->request->input('unit'),
            'unit_price' => (float)$this->request->input('unit_price'),
            'stock_quantity' => (int)$this->request->input('stock_quantity'),
            'usage_instruction' => $this->request->input('usage_instruction'),
            'status' => $this->request->input('status', 'active')
        ]);

        Session::flash('success', 'Cập nhật kho thuốc thành công!');
        $this->redirect('/admin/medicines');
    }
}
