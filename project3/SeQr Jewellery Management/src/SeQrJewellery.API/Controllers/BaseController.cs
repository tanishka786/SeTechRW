using Microsoft.AspNetCore.Mvc;
using SeQrJewellery.Application.DTOs.Common;

namespace SeQrJewellery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class BaseController : ControllerBase
{
    protected IActionResult OkResult<T>(T data, string? message = null)
        => Ok(ApiResponse<T>.Ok(data, message));

    protected IActionResult CreatedResult<T>(T data, string? message = null)
        => StatusCode(201, ApiResponse<T>.Ok(data, message));

    protected IActionResult NotFoundResult(string message)
        => NotFound(ApiResponse<object>.Fail(message));

    protected IActionResult BadRequestResult(string message)
        => BadRequest(ApiResponse<object>.Fail(message));

    protected IActionResult ErrorResult(string message)
        => StatusCode(500, ApiResponse<object>.Fail(message));
}
