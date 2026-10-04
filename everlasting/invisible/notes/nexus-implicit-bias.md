# Nexus 优化器的 implicit bias：优化梯度相似度

> 取自 arxiv.org/abs/2604.09258

[TOC]

# 命题

## 定理 1

已知 Nexus 优化器的算法如下：

$$
\begin{array}{ll}
\textbf{Require:} &
\text{Initial parameters } \theta_0,\ 
\text{losses } \{\mathcal{L}_i\}_{i=1}^{K},\
\text{total iterations } T. \\

\textbf{Require:} &
\text{Optimizers: }
\mathrm{Opt}_{\mathrm{inner}}\text{ (Normalized SGD)},\
\mathrm{Opt}_{\mathrm{outer}}\text{ (e.g., AdamW)}. \\
&
\text{Inner learning rate } \gamma. \\

1: & \textbf{for } t=1 \textbf{ to } T \textbf{ do} \\

2: & \qquad \theta_{t,0} \gets \theta_{t-1}
\qquad \text{\{Initialize inner loop\}} \\

3: & \qquad \textbf{for } m=1 \textbf{ to } K \textbf{ do} \\

4: & \qquad\qquad
\text{Sample task index }
s_m \sim \mathrm{Uniform}(\{1,\ldots,K\}) \\

5: & \qquad\qquad
g \gets \nabla \mathcal{L}_{s_m}(\theta_{t,m-1}) \\

6: & \qquad\qquad
\theta_{t,m}
\gets
\theta_{t,m-1}
-\gamma\cdot\frac{g}{\lVert g\rVert_2}
\qquad \text{\{Update inner trajectory\}} \\

7: & \qquad
\hat{g}_t \gets \theta_{t,0}-\theta_{t,K}
\qquad \text{\{Compute Nexus pseudo-gradient\}} \\

8: & \qquad
\theta_t \gets
\mathrm{Opt}_{\mathrm{outer}}(\theta_{t-1},\hat{g}_t)
\qquad \text{\{Outer-update\}} \\[4pt]

& \textbf{Return: } \theta_T
\end{array}
$$

内层循环进行归一化梯度更新，累积 $K$ 步得到的伪梯度再用于外层更新。

假设存在常数 $G_{\min},L,\rho>0$，使得对于任意 $t\in[1,T]$ 和 $m\in[1,K]$，都有：

$$
\|\nabla\mathcal{L}_i(\theta_{t,m})\|_2\geq G_{\min},
\qquad
\|\nabla^2\mathcal{L}_i(\theta)\|_2\leq L,
\qquad
\|\nabla^2\mathcal{L}_i(x)-\nabla^2\mathcal{L}_i(y)\|_2
\leq
\rho\|x-y\|_2.
$$

那么，由 Nexus 优化器生成的序列 $\{\theta_t\}$ 实际上最小化了如下二阶目标函数：

$$
\mathcal{J}_{2\mathrm{nd}}(\theta)
=
\gamma\sum_{i=1}^{K}\|\mathcal{L}_i(\theta)\|_2
-
\gamma^2\frac{K-1}{4K}
\sum_{i\neq j}
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right).
$$

这是因为，期望更新方向满足：

$$
\mathbb{E}[\hat{g}_t]
=
\gamma\sum_{i=1}^{K}
\frac{\nabla\mathcal{L}_i(\theta_t)}
{\|\nabla\mathcal{L}_i(\theta_t)\|_2}
-
\gamma^2\frac{K-1}{4K}
\nabla_\theta
\sum_{i\neq j}
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i,
\nabla\mathcal{L}_j
\right)
+
\mathcal{E}_{2\mathrm{nd}}.
$$

其中，近似误差满足：

$$
\|\mathcal{E}_{2\mathrm{nd}}\|_2
\leq
\frac{1}{6}
\left(
\frac{4L^2+\rho G_{\min}}
{G_{\min}^2}
\right)
K^3\gamma^3
=
\mathcal{O}(\gamma^3).
$$

也就是说，Nexus 的更新方向中包含一个与梯度余弦相似度相关的二阶项，因此该算法会倾向于最大化不同任务梯度之间的相似性。

> [不同任务的 closeness 与其梯度余弦相似度的关系​](https://www.bilibili.com/opus/1239784400733863977?spm_id_from=333.1369.0.0)证明了梯度的余项相似度是 closeness 的上界，而这个定理证明了 Nexus 优化器在优化这个上界。

# 命题的证明

## 定理 1 的证明

首先定义 $L_1$ 和 $L_2$ 分别为归一化梯度及其雅可比矩阵的 Lipschitz 常数，也即

$$
\left\|
\frac{\nabla\mathcal{L}_i(x)}
{\|\nabla\mathcal{L}_i(x)\|_2}
-
\frac{\nabla\mathcal{L}_i(y)}
{\|\nabla\mathcal{L}_i(y)\|_2}
\right\|_2
\leq
L_1\|x-y\|_2.
$$

和

$$
\|\mathcal{J}_i(x)-\mathcal{J}_i(y)\|_2
\leq
L_2\|x-y\|_2,
$$

其中

$$
\mathcal{J}_i(\theta)
=
\frac{\partial}{\partial\theta}
\left(
\frac{\nabla\mathcal{L}_i(\theta)}
{\|\nabla\mathcal{L}_i(\theta)\|_2}
\right).
$$

下面来推导 $L_1$ 和 $L_2$。

根据中值定理，$L_1$ 的上界就是雅可比矩阵 $\mathcal{J}_i(\theta)$ 的谱范数上确界。求导可得，雅可比矩阵的具体形式为：

$$
\mathcal{J}_i(\theta)
=
\frac{1}{\|\nabla\mathcal{L}_i\|_2}
\left(
I-
\frac{\nabla\mathcal{L}_i\nabla\mathcal{L}_i^\top}
{\|\nabla\mathcal{L}_i\|_2^2}
\right)
\nabla^2\mathcal{L}_i(\theta).
$$

其中，中间项是一个正交投影矩阵，其谱范数为 $1$（可参见谱范数的性质）。利用假设中的界，有：

$$
L_1
\leq
\sup_{\theta}\|\mathcal{J}_i(\theta)\|_2
\leq
\frac{1}{G_{\min}}\cdot 1\cdot L
=
\frac{L}{G_{\min}}.
$$

然后来推 $L_2$。将雅可比矩阵 $\mathcal{J}_i(\theta)$ 分解为三个部分：标量项 $u(\theta)$、投影项 $\Pi(\theta)$ 和 Hessian 项 $H_i(\theta)$：

$$
\mathcal{J}_i(\theta)
=
\underbrace{\|\nabla\mathcal{L}_i(\theta)\|_2^{-1}}_{u(\theta)}
\underbrace{
\left(
I-
\frac{\nabla\mathcal{L}_i\nabla\mathcal{L}_i^\top}
{\|\nabla\mathcal{L}_i\|_2^2}
\right)
}_{\Pi(\theta)}
\underbrace{\nabla^2\mathcal{L}_i(\theta)}_{H_i(\theta)}.
$$

我们应用乘积的 Lipschitz 规则。对于三个函数的乘积 $f=abc$，其 Lipschitz 常数满足：

$$
L_f
\leq
L_aM_bM_c
+
M_aL_bM_c
+
M_aM_bL_c,
$$

其中，$M_{(\cdot)}$ 表示相应函数幅值的上界，$L_{(\cdot)}$ 表示其 Lipschitz 常数。

（证明：

设 $a,b,c$ 定义在同一个度量空间上，并分别满足

$$
|a(x)-a(y)|\le L_a d(x,y),\qquad
|b(x)-b(y)|\le L_b d(x,y),\qquad
|c(x)-c(y)|\le L_c d(x,y),
$$

且

$$
M_a=\sup_x |a(x)|,\qquad
M_b=\sup_x |b(x)|,\qquad
M_c=\sup_x |c(x)|.
$$

对任意 $x,y$，将差值作如下分解：

$$
\begin{aligned}
f(x)-f(y)
&=a(x)b(x)c(x)-a(y)b(y)c(y)\\
&=[a(x)-a(y)]b(x)c(x)\\
&\quad+a(y)[b(x)-b(y)]c(x)\\
&\quad+a(y)b(y)[c(x)-c(y)].
\end{aligned}
$$

因此，由三角不等式，

$$
\begin{aligned}
|f(x)-f(y)|
&\le |a(x)-a(y)|\,|b(x)|\,|c(x)|\\
&\quad+|a(y)|\,|b(x)-b(y)|\,|c(x)|\\
&\quad+|a(y)|\,|b(y)|\,|c(x)-c(y)|\\
&\le \bigl(
L_aM_bM_c
+M_aL_bM_c
+M_aM_bL_c
\bigr)d(x,y).
\end{aligned}
$$

这就证明了结论。）

**标量项**

$$
u(\theta)=\|\nabla\mathcal{L}_i\|_2^{-1}.
$$

求梯度：

$$
\nabla u
=
\nabla\left((\|\nabla\mathcal{L}_i\|_2^{2})^{-\frac{1}{2}}\right)
=
-\frac{\nabla^2\mathcal{L}_i\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2^3}
=
-\frac{H_i\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2^3}.
$$

取范数可得：

$$
\|\nabla u\|_2
\leq
\frac{\|H_i\|_2\|\nabla\mathcal{L}_i\|_2}
{\|\nabla\mathcal{L}_i\|_2^3}
=
\frac{\|H_i\|_2}
{\|\nabla\mathcal{L}_i\|_2^2}.
$$

利用 $L$ 和 $G_{\min}$ 的界分别 bound 分子和分母，可得：

$$
L_u=\frac{L}{G_{\min}^2}.
$$

**投影项**

$$
\Pi(\theta)=I-
\frac{\nabla\mathcal{L}_i\nabla\mathcal{L}_i^\top}
{\|\nabla\mathcal{L}_i\|_2^2}
=
II^\top-\left(\frac{\nabla\mathcal{L}_i}{\|\nabla\mathcal{L}_i\|_2}\right)\left(\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}\right)^\top
.
$$

对于任意单位向量 $x,y$，有：

$$
\|xx^\top-yy^\top\|_2
\leq
\|x-y\|_2+\|x-y\|_2
=
2\|x-y\|_2.
$$

根据链式法则，

$$
L_{\Pi}=2L_1=\frac{2L}{G_{\min}}.
$$

**Hessian 项**

根据假设，其 Lipschitz 常数为：

$$
L_H=\rho.
$$

将上述各项代入乘积规则，可得：

$$
\begin{aligned}
L_uM_{\Pi}M_H
+
M_uL_{\Pi}M_H
+
M_uM_{\Pi}L_H
&\leq
\left(\frac{L}{G_{\min}^2}\cdot 1\cdot L\right)
+
\left(\frac{1}{G_{\min}}\cdot
\frac{2L}{G_{\min}}\cdot L\right)
+
\left(\frac{1}{G_{\min}}\cdot 1\cdot\rho\right)
\\
&=
\frac{L^2}{G_{\min}^2}
+
\frac{2L^2}{G_{\min}^2}
+
\frac{\rho}{G_{\min}}.
\end{aligned}
$$

合并各项后，得到最终常数：

$$
L_2
=
\frac{3L^2+\rho G_{\min}}
{G_{\min}^2}.
$$

$L_1$ 和 $L_2$ 的结果得出后，我们开始处理内循环的每一步更新。记内部循环的第 $m$ 步随机抽到的任务为 $s_m$，该更新为

$$
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}
$$

这里的归一化梯度是 $\theta_{t,m-1}$ 处的，我们以初始点 $\theta_{t,0}$ 为中心将其展开。

令

$$
\Delta\theta_{m-1}
=
\theta_{t,m-1}-\theta_{t,0}.
$$

应用带余项的泰勒定理：

$$
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}
=
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,0})\|_2
}
+
\mathcal{J}_{s_m}(\theta_{t,0})
\Delta\theta_{m-1}
+
r_m.
\tag{1}
$$

其中余项为

$$
r_m
=
\int_0^1
\left[
\mathcal{J}_{s_m}(\theta_{t,0}+\tau\Delta\theta_{m-1})-\mathcal{J}_{s_m}(\theta_{t,0})
\right]
\Delta\theta_{m-1}
\,\mathrm d\tau.
$$

利用雅可比矩阵的 $L_2$\-Lipschitz 性质，余项向量 $r_m$ 满足

$$
\|r_m\|_2
\leq
\frac{L_2}{2}
\|\Delta\theta_{m-1}\|_2^2.
$$

位移量 $\Delta\theta_{m-1}$ 是此前各次更新的总和：

$$
\Delta\theta_{m-1}
=
\sum_{l=1}^{m-1}
\left(\theta_{t,l}-\theta_{t,l-1}\right)
=
-\gamma
\sum_{l=1}^{m-1}
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}.
$$

我们把归一化梯度都写成在 $\theta_{t,0}$ 处的：

$$
\Delta\theta_{m-1}
=
-\gamma
\sum_{l=1}^{m-1}
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
-
\gamma\sum_{l=1}^{m-1}
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)
\tag{2}
$$

之后利用归一化梯度的 $L_1$\-Lipschitz 性质来近似差距：

$$
\begin{aligned}
\left\|
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right\|_2
&\leq
L_1\|\theta_{t,l-1}-\theta_{t,0}\|_2
\\
&=
L_1
\left\|
-\sum_{j=1}^{l-1}
\gamma
\frac{
\nabla\mathcal{L}_{s_j}(\theta_{t,j})
}{
\|\nabla\mathcal{L}_{s_j}(\theta_{t,j})\|_2
}
\right\|_2
\\
&\leq
L_1(l-1)\gamma.
\end{aligned}
$$

进而累积误差可以通过对各项误差求和来界定：

$$
\begin{aligned}
\left\|\sum_{l=1}^{m-1}
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)\right\|_2
&\leq
\sum_{l=1}^{m-1}
L_1(l-1)\gamma
\\
&=
L_1\gamma
\frac{(m-1)(m-2)}{2}
\\
&\leq
\frac{L_1}{2}(m-1)^2\gamma.
\end{aligned}
$$

将式 (2) 得到的 $\Delta\theta_{m-1}$ 的表达式代回前面的泰勒展开式 (1)，得到：

$$
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}
=
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,0})\|_2
}
-
\gamma
\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}(\theta_{t,0})
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
-
\gamma\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}(\theta_{t,0})
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)
+r_m
\tag{3}
$$

记最后两项之和为累计误差 $\mathcal E_m$：

$$
\mathcal{E}_m=
-
\gamma\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}(\theta_{t,0})
\left(
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,l-1})\|_2
}
-
\frac{
\nabla\mathcal{L}_{s_l}(\theta_{t,0})
}{
\|\nabla\mathcal{L}_{s_l}(\theta_{t,0})\|_2
}
\right)
+r_m
$$

根据前面对于归一化梯度差距与 $r_m$ 的放缩可得

$$
\|\mathcal E_m\|_2
\leq
\gamma\|\mathcal{J}_{s_m}\|\cdot\frac{L_1}{2}(m-1)^2\gamma
+
\frac{L_2}{2}
\|\Delta\theta_{m-1}\|_2^2
$$

利用 $\|\mathcal{J}_{s_m}\|_2\leq L_1$ 以及归一化梯度性质

$$
\|\Delta\theta_{m-1}\|_2\leq(m-1)\gamma,
$$

可得：

$$
\|\mathcal{E}_m\|_2
\leq
\frac{L_2+L_1^2}{2}
(m-1)^2\gamma^2.
$$

总伪梯度为

$$
\hat{g}_t
=
\gamma
\sum_{m=1}^{k}
\frac{
\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})
}{
\|\nabla\mathcal{L}_{s_m}(\theta_{t,m-1})\|_2
}.
$$

将式 (3) 后两项记作 $\mathcal E_m$ 然后代入，可得：

$$
\hat{g}_t
=
\gamma
\sum_{m=1}^{k}
\frac{\nabla\mathcal{L}_{s_m}}
{\|\nabla\mathcal{L}_{s_m}\|_2}
-
\gamma^2
\sum_{m=1}^{k}
\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}
\frac{\nabla\mathcal{L}_{s_l}}
{\|\nabla\mathcal{L}_{s_l}\|_2}
+
\gamma
\sum_{m=1}^{k}\mathcal{E}_m.
\tag{4}
$$

这里为简化记号，省略了参数 $\theta_{t,0}$ 这一自变量；上述所有项均在 $\theta_{t,0}$ 处计算，后文也是。

最后一项的总误差向量记作 $\mathcal E_{\mathrm{total}}$，可以通过求和得到上界：

$$
\begin{aligned}
\|\mathcal E_{\mathrm{total}}\|_2
=
\left\|
\gamma
\sum_{m=1}^{k}\mathcal{E}_m
\right\|_2
&\leq
\gamma
\sum_{m=1}^{k}
\frac{L_2+L_1^2}{2}
(m-1)^2\gamma^2
\\
&\leq
\frac{L_2+L_1^2}{6}
k^3\gamma^3.
\end{aligned}
\tag{5}
$$

也就是说，总误差为三阶量：

$$
\|\mathcal{E}_{\mathrm{total}}\|_2
=
\mathcal{O}(k^3\gamma^3).
$$

然后来对式 (4) 求期望：

**线性项。** 令

$$
\mathcal{T}_{\mathrm{linear}}
=
\sum_{m=1}^{k}
\frac{\nabla\mathcal{L}_{s_m}}
{\|\nabla\mathcal{L}_{s_m}\|_2}.
$$

根据期望的线性性质，有：

$$
\mathbb{E}[\mathcal{T}_{\mathrm{linear}}]
=
k\cdot\frac{1}{k}
\sum_{i=1}^{k}
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}
=
\sum_{i=1}^{k}
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}.
$$

**交互项。** 令

$$
\mathcal{T}_{\mathrm{interact}}
=
\sum_{m=1}^{k}
\sum_{l=1}^{m-1}
\mathcal{J}_{s_m}
\frac{\nabla\mathcal{L}_{s_l}}
{\|\nabla\mathcal{L}_{s_l}\|_2}.
$$

由于 $m>l$，所以 $s_m$ 和 $s_l$ 相互独立。因此：

$$
\mathbb{E}\left[
\mathcal{J}_{s_m}
\frac{\nabla\mathcal{L}_{s_l}}
{\|\nabla\mathcal{L}_{s_l}\|_2}
\right]
=
\frac{1}{k^2}
\sum_{i=1}^{k}
\sum_{j=1}^{k}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}.
$$

对所有配对求和可得：

$$
\begin{aligned}
\mathbb{E}[\mathcal{T}_{\mathrm{interact}}]
&=
\frac{k(k-1)}{2}
\cdot
\frac{1}{k^2}
\sum_{i=1}^{k}
\sum_{j=1}^{k}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
\\
&=
\frac{k-1}{2k}
\sum_{i,j}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}.
\end{aligned}
$$

我们将 $\nabla S_{ij}$ 定义为任务 $i$ 与任务 $j$ 之间余弦相似度的梯度。具体而言：

$$
\nabla S_{ij}
=
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
+
\mathcal{J}_j
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}.
$$

注意到求和项

$$
\sum_{i,j}
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
$$

关于 $i$ 和 $j$ 是对称的，因此交互项的期望可以改写为：

$$
\begin{aligned}
\mathbb{E}[\mathcal{T}_{\mathrm{interact}}]
&=
\frac{k-1}{4k}
\sum_{i,j}
\left(
\mathcal{J}_i
\frac{\nabla\mathcal{L}_j}
{\|\nabla\mathcal{L}_j\|_2}
+
\mathcal{J}_j
\frac{\nabla\mathcal{L}_i}
{\|\nabla\mathcal{L}_i\|_2}
\right)
\\
&=
\frac{k-1}{4k}
\sum_{i,j}
\nabla S_{ij}(\theta_{t,0}).
\end{aligned}
$$

将线性项和交互项结合起来，Nexus 的期望更新方向为：

$$
\mathbb{E}[\hat{g}_t]
=
\gamma
\sum_{i=1}^{k}
\frac{\nabla\mathcal{L}_i(\theta_{t,0})}
{\|\nabla\mathcal{L}_i(\theta_{t,0})\|_2}
-
\gamma^2
\frac{k-1}{4k}
\sum_{i,j}
\nabla S_{ij}(\theta_{t,0})
+
\mathcal{E}_{\mathrm{total}}.
$$

式 (5) 给出了 $\mathcal E_{\mathrm{total}}$ 的范数上界，把 $L_1$ 和 $L_2$ 的结果代入，可得：

$$
\|\mathcal{E}_{\mathrm{total}}\|_2
\leq
\frac{1}{6}
\left(
\frac{\rho G_{\min}+4L^2}
{G_{\min}^2}
\right)
k^3\gamma^3.
$$

这就证明了结论。

这表明，Nexus 的更新方向先是遵循损失函数的梯度，同时包含一个相似度对齐项，隐式地优化梯度间的相似度；同时，其误差被一个有界的三次项所控制。

> 封面来自 https://osu.ppy.sh/beatmapsets/909888#osu/1898745 FELT - Vagueness & JOURNEY
