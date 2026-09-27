<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Service;
use App\Models\Specialty;

class ServiceController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $serviceModel = new Service();
        $services = $serviceModel->getAllWithSpecialty();

        $this->view('admin/services/index', [
            'pageTitle' => 'Quản lý dịch vụ khám',
            'services' => $services
        ], 'layouts/admin');
    }

    public function create(): void {
        Auth::requireRole('admin');

        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->where("status = 'active'", [], 'name ASC');

        $this->view('admin/services/form', [
            'pageTitle' => 'Thêm dịch vụ khám mới',
            'service' => null,
            'specialties' => $specialties
        ], 'layouts/admin');
    }

    public function store(): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'specialty_id' => 'required|numeric',
            'name' => 'required|min:2',
            'price' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/services/create');
            return;
        }

        $serviceModel = new Service();
        $serviceModel->create([
            'specialty_id' => (int)$this->request->input('specialty_id'),
            'name' => $this->request->input('name'),
            'description' => $this->request->input('description'),
            'price' => (float)$this->request->input('price'),
            'duration_minutes' => (int)$this->request->input('duration_minutes', 30),
            'status' => $this->request->input('status', 'active')
        ]);

        Session::flash('success', 'Thêm dịch vụ khám mới thành công!');
        $this->redirect('/admin/services');
    }

    public function edit(int $id): void {
        Auth::requireRole('admin');

        $serviceModel = new Service();
        $service = $serviceModel->find($id);

        if (!$service) {
            Response::error(404);
            return;
        }

        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->where("status = 'active'", [], 'name ASC');

        $this->view('admin/services/form', [
            'pageTitle' => 'Chỉnh sửa dịch vụ: ' . $service['name'],
            'service' => $service,
            'specialties' => $specialties
        ], 'layouts/admin');
    }

    public function update(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'specialty_id' => 'required|numeric',
            'name' => 'required|min:2',
            'price' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/services/edit/' . $id);
            return;
        }

        $serviceModel = new Service();
        $serviceModel->update($id, [
            'specialty_id' => (int)$this->request->input('specialty_id'),
            'name' => $this->request->input('name'),
            'description' => $this->request->input('description'),
            'price' => (float)$this->request->input('price'),
            'duration_minutes' => (int)$this->request->input('duration_minutes', 30),
            'status' => $this->request->input('status', 'active')
        ]);

        Session::flash('success', 'Cập nhật dịch vụ thành công!');
        $this->redirect('/admin/services');
    }
}
